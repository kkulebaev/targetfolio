import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { usePortfolioStore } from "./portfolio";

describe("usePortfolioStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("instruments and instrumentsByTicker are sourced from the catalog", () => {
    const store = usePortfolioStore();
    expect(store.instruments.length).toBeGreaterThan(0);
    const sber = store.instrumentsByTicker.get("SBER");
    expect(sber).toBeDefined();
    expect(sber!.lotSize).toBe(1);
  });

  it("loadFromMock fills positions from fixture", () => {
    const store = usePortfolioStore();
    store.loadFromMock();
    expect(store.positions.length).toBeGreaterThan(0);
    expect(store.source).toBe("mock");
  });

  it("totalValue sums quantity * price across catalog instruments", () => {
    const store = usePortfolioStore();
    store.upsertPosition({ ticker: "SBER", quantity: 10 });
    store.upsertPosition({ ticker: "GAZP", quantity: 20 });
    const sberPrice = store.instrumentsByTicker.get("SBER")!.price;
    const gazpPrice = store.instrumentsByTicker.get("GAZP")!.price;
    expect(store.totalValue).toBe(10 * sberPrice + 20 * gazpPrice);
  });

  it("upsertPosition rejects tickers outside the catalog", () => {
    const store = usePortfolioStore();
    store.upsertPosition({ ticker: "FAKE", quantity: 10 });
    expect(store.positions.find((p) => p.ticker === "FAKE")).toBeUndefined();
  });

  it("removePosition drops the entry", () => {
    const store = usePortfolioStore();
    store.upsertPosition({ ticker: "SBER", quantity: 10 });
    store.removePosition("SBER");
    expect(store.positions.find((p) => p.ticker === "SBER")).toBeUndefined();
  });
});
