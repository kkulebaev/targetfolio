import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useTargetStore } from "./target";

describe("useTargetStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("initial currentPreset is 'custom' on a fresh store", () => {
    const store = useTargetStore();
    expect(store.currentPreset).toBe("custom");
    expect(store.targetWeights).toEqual([]);
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

  it("applyPreset fills targetWeights summing to 100 and sets currentPreset", () => {
    const store = useTargetStore();
    store.applyPreset("imoex");
    expect(store.targetWeights.length).toBeGreaterThan(0);
    expect(store.isValid).toBe(true);
    expect(store.currentPreset).toBe("imoex");
  });

  it("addTicker rejects ticker outside the catalog", () => {
    const store = useTargetStore();
    store.addTicker("FAKE");
    expect(store.targetWeights).toHaveLength(0);
    expect(store.currentPreset).toBe("custom");
  });

  it("addTicker is a no-op for tickers already in targetWeights", () => {
    const store = useTargetStore();
    store.applyPreset("imoex");
    const before = store.targetWeights.length;
    store.addTicker("SBER");
    expect(store.targetWeights.length).toBe(before);
    expect(store.currentPreset).toBe("imoex");
  });

  it("setWeight after applyPreset flips currentPreset to 'custom'", () => {
    const store = useTargetStore();
    store.applyPreset("imoex");
    store.setWeight("SBER", 50);
    expect(store.currentPreset).toBe("custom");
  });

  it("removeTicker after applyPreset flips currentPreset to 'custom'", () => {
    const store = useTargetStore();
    store.applyPreset("imoex");
    store.removeTicker("SBER");
    expect(store.currentPreset).toBe("custom");
  });

  it("clear flips currentPreset to 'custom'", () => {
    const store = useTargetStore();
    store.applyPreset("imoex");
    store.clear();
    expect(store.targetWeights).toEqual([]);
    expect(store.currentPreset).toBe("custom");
  });

  it("re-applying a preset restores weights and resets mode to that preset", () => {
    const store = useTargetStore();
    store.applyPreset("imoex");
    store.setWeight("SBER", 1);
    expect(store.currentPreset).toBe("custom");
    store.applyPreset("imoex");
    expect(store.currentPreset).toBe("imoex");
    expect(store.isValid).toBe(true);
  });
});
