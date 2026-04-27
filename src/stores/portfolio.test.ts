import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { usePortfolioStore } from "./portfolio";

describe("usePortfolioStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("loadFromMock fills instruments and positions from fixture", () => {
    const store = usePortfolioStore();
    store.loadFromMock();
    expect(store.instruments.length).toBeGreaterThan(0);
    expect(store.positions.length).toBeGreaterThan(0);
    expect(store.source).toBe("mock");
    const sber = store.instrumentsByTicker.get("SBER");
    expect(sber).toBeDefined();
    expect(sber!.lotSize).toBe(1);
  });

  it("totalValue sums quantity * price across known instruments", () => {
    const store = usePortfolioStore();
    store.upsertInstrument({ ticker: "SBER", name: "Сбер", lotSize: 10, price: 300 });
    store.upsertInstrument({ ticker: "GAZP", name: "Газпром", lotSize: 10, price: 150 });
    store.upsertPosition({ ticker: "SBER", quantity: 10 });
    store.upsertPosition({ ticker: "GAZP", quantity: 20 });
    expect(store.totalValue).toBe(10 * 300 + 20 * 150);
  });

  it("removeInstrument also drops matching positions", () => {
    const store = usePortfolioStore();
    store.upsertInstrument({ ticker: "SBER", name: "Сбер", lotSize: 10, price: 300 });
    store.upsertPosition({ ticker: "SBER", quantity: 10 });
    store.removeInstrument("SBER");
    expect(store.instruments.find((i) => i.ticker === "SBER")).toBeUndefined();
    expect(store.positions.find((p) => p.ticker === "SBER")).toBeUndefined();
  });
});
