import { afterEach, describe, expect, it, vi } from "vitest";

import { getAccounts, getPositions, TinkoffApiError } from "./tinkoff";
import { TinkoffResponseError } from "./tinkoff-schema";

function stubFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("T-Invest API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed data for a valid response", async () => {
    stubFetch(async () => new Response(JSON.stringify({ money: [] }), { status: 200 }));
    await expect(getPositions("t", "acc")).resolves.toEqual({ money: [] });
  });

  it("explains an invalid token instead of echoing the raw body", async () => {
    stubFetch(
      async () => new Response(JSON.stringify({ code: 16, message: "40003" }), { status: 401 }),
    );
    const error = await getAccounts("bad").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TinkoffApiError);
    expect((error as TinkoffApiError).status).toBe(401);
    expect((error as Error).message).toMatch(/Токен недействителен/);
  });

  it("reports rate limiting", async () => {
    stubFetch(async () => new Response("", { status: 429 }));
    await expect(getAccounts("t")).rejects.toThrow(/лимит запросов/);
  });

  it("uses the API description for other HTTP errors", async () => {
    stubFetch(
      async () =>
        new Response(JSON.stringify({ code: 3, message: "30052", description: "bad account" }), {
          status: 400,
        }),
    );
    await expect(getAccounts("t")).rejects.toThrow("Ошибка T‑Invest API (HTTP 400): 30052");
  });

  it("falls back to the raw body when the error is not JSON", async () => {
    stubFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(getAccounts("t")).rejects.toThrow("(HTTP 502): <html>Bad gateway</html>");
  });

  it("reports a network failure", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(getAccounts("t")).rejects.toThrow(/Не удалось связаться/);
  });

  it("reports a timeout", async () => {
    stubFetch(async () => {
      throw new DOMException("signal timed out", "TimeoutError");
    });
    await expect(getAccounts("t")).rejects.toThrow(/не ответил вовремя/);
  });

  it("reports a timeout that happens while reading the body", async () => {
    stubFetch(async () => {
      const res = new Response("{}", { status: 200 });
      vi.spyOn(res, "text").mockRejectedValue(new DOMException("signal timed out", "TimeoutError"));
      return res;
    });
    await expect(getAccounts("t")).rejects.toThrow(/не ответил вовремя/);
  });

  it("reports a non-JSON success body", async () => {
    stubFetch(async () => new Response("not json", { status: 200 }));
    await expect(getAccounts("t")).rejects.toThrow(/не в формате JSON/);
  });

  it("rejects a response of the wrong shape", async () => {
    stubFetch(async () => new Response(JSON.stringify({ accounts: "nope" }), { status: 200 }));
    await expect(getAccounts("t")).rejects.toBeInstanceOf(TinkoffResponseError);
  });

  it("passes a timeout signal to fetch", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getAccounts("t");
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
