import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useTargetStore } from "./target";

describe("useTargetStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("addTicker adds entry once and is idempotent", () => {
    const store = useTargetStore();
    store.addTicker("SBER");
    store.addTicker("SBER");
    expect(store.targetWeights).toHaveLength(1);
    expect(store.targetWeights[0]).toEqual({ ticker: "SBER", weightPercent: 0 });
  });

  it("isValid is true only when weights sum to 100", () => {
    const store = useTargetStore();
    store.addTicker("SBER");
    store.addTicker("GAZP");
    store.setWeight("SBER", 60);
    store.setWeight("GAZP", 40);
    expect(store.total).toBe(100);
    expect(store.isValid).toBe(true);
    store.setWeight("GAZP", 30);
    expect(store.isValid).toBe(false);
  });

  it("removeTicker drops the entry", () => {
    const store = useTargetStore();
    store.addTicker("SBER");
    store.addTicker("GAZP");
    store.removeTicker("SBER");
    expect(store.targetWeights).toHaveLength(1);
    expect(store.targetWeights[0]!.ticker).toBe("GAZP");
  });
});
