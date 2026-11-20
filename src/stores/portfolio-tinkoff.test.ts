import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { INSTRUMENTS_BY_TICKER } from "@/catalog/instruments";
import { ALL_ACCOUNTS, usePortfolioStore } from "./portfolio";

const SBER_FIGI = INSTRUMENTS_BY_TICKER.get("SBER")!.figi!;
const GAZP_FIGI = INSTRUMENTS_BY_TICKER.get("GAZP")!.figi!;

const PORTFOLIOS: Record<string, unknown[]> = {
  acc1: [
    { figi: SBER_FIGI, instrumentType: "share", quantity: { units: "10", nano: 0 } },
    { figi: "RUB000UTSTOM", instrumentType: "currency", quantity: { units: "999", nano: 0 } },
  ],
  acc2: [
    { figi: SBER_FIGI, instrumentType: "share", quantity: { units: "5", nano: 0 } },
    { figi: GAZP_FIGI, instrumentType: "share", quantity: { units: "20", nano: 0 } },
    { figi: "BBG_TMOS", instrumentType: "etf", ticker: "TMOS", quantity: { units: "7", nano: 0 } },
  ],
  closed: [{ figi: GAZP_FIGI, instrumentType: "share", quantity: { units: "1000", nano: 0 } }],
};

const MONEY: Record<string, unknown[]> = {
  acc1: [{ currency: "rub", units: "1500", nano: 0 }],
  acc2: [{ currency: "rub", units: "250", nano: 500_000_000 }],
  closed: [{ currency: "rub", units: "100000", nano: 0 }],
};

function fakeFetch(url: string, init?: { body?: string }): Promise<Response> {
  const body = JSON.parse(init?.body ?? "{}") as { accountId?: string };
  let payload: unknown;
  if (url.endsWith("/GetAccounts")) {
    payload = {
      accounts: [
        { id: "acc1", type: "", name: "Брокерский", status: "ACCOUNT_STATUS_OPEN" },
        { id: "acc2", type: "", name: "ИИС", status: "ACCOUNT_STATUS_OPEN" },
        { id: "closed", type: "", name: "Старый", status: "ACCOUNT_STATUS_CLOSED" },
      ],
    };
  } else if (url.endsWith("/GetPortfolio")) {
    payload = { positions: PORTFOLIOS[body.accountId!] };
  } else if (url.endsWith("/GetPositions")) {
    payload = { money: MONEY[body.accountId!] };
  } else {
    return Promise.resolve(new Response("not found", { status: 404 }));
  }
  return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
}

describe("usePortfolioStore T-Invest loading", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.stubGlobal("fetch", vi.fn(fakeFetch));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the first account by default with its free roubles", async () => {
    const store = usePortfolioStore();
    store.setTinkoffToken("token");
    await store.loadFromTinkoff();
    expect(store.tinkoffStatus).toBe("success");
    expect(store.tinkoffAccountId).toBe("acc1");
    expect(store.positions).toEqual([{ ticker: "SBER", quantity: 10 }]);
    expect(store.tinkoffFreeCash).toBe(1500);
    expect(store.tinkoffSkipped).toEqual([]);
  });

  it("aggregates every open account when all accounts are selected", async () => {
    const store = usePortfolioStore();
    store.setTinkoffToken("token");
    store.setTinkoffAccountId(ALL_ACCOUNTS);
    await store.loadFromTinkoff();
    expect(store.tinkoffStatus).toBe("success");
    expect(store.tinkoffAccountId).toBe(ALL_ACCOUNTS);
    expect(store.positions).toEqual([
      { ticker: "SBER", quantity: 15 },
      { ticker: "GAZP", quantity: 20 },
    ]);
    expect(store.tinkoffFreeCash).toBe(1750.5);
    expect(store.tinkoffSkipped).toEqual([
      { key: "figi:BBG_TMOS", label: "TMOS", instrumentType: "etf", quantity: 7 },
    ]);
    expect(store.tinkoffSkippedCount).toBe(1);
  });
  it("keeps the portfolio when the balance request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: { body?: string }) =>
        url.endsWith("/GetPositions")
          ? Promise.resolve(new Response("boom", { status: 500 }))
          : fakeFetch(url, init),
      ),
    );
    const store = usePortfolioStore();
    store.setTinkoffToken("token");
    await store.loadFromTinkoff();
    expect(store.tinkoffStatus).toBe("success");
    expect(store.positions).toEqual([{ ticker: "SBER", quantity: 10 }]);
    expect(store.tinkoffFreeCash).toBeNull();
  });

  it("ignores a slower response from a previously selected account", async () => {
    let gateActive = false;
    let releaseSlow: () => void = () => {};
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { body?: string }) => {
        const body = JSON.parse(init?.body ?? "{}") as { accountId?: string };
        if (gateActive && body.accountId === "acc1") await slowGate;
        return fakeFetch(url, init);
      }),
    );
    const store = usePortfolioStore();
    store.setTinkoffToken("token");
    store.setTinkoffAccountId("acc1");
    await store.loadFromTinkoff();
    // Accounts are cached now; start a slow acc1 load, then switch to acc2.
    gateActive = true;
    const slow = store.loadFromTinkoff();
    store.setTinkoffAccountId("acc2");
    await store.loadFromTinkoff();
    releaseSlow();
    await slow;
    expect(store.tinkoffAccountId).toBe("acc2");
    expect(store.tinkoffFreeCash).toBe(250.5);
    expect(store.positions.map((p) => p.ticker)).toEqual(["SBER", "GAZP"]);
  });
});
