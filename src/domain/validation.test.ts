import { describe, expect, it } from "vitest";

import {
  isWeightsValid,
  parsePersistedState,
  validateInstrument,
  validatePosition,
  validateTargetWeight,
  weightsTotal,
} from "./validation";

describe("validateInstrument", () => {
  it("accepts a valid instrument", () => {
    const result = validateInstrument({ ticker: "SBER", name: "Сбер", lotSize: 10, price: 300 });
    expect(result.ok).toBe(true);
  });

  it("rejects null and non-objects", () => {
    expect(validateInstrument(null).ok).toBe(false);
    expect(validateInstrument("foo").ok).toBe(false);
    expect(validateInstrument(42).ok).toBe(false);
  });

  it("rejects empty or whitespace ticker", () => {
    expect(validateInstrument({ ticker: "", name: "x", lotSize: 1, price: 1 }).ok).toBe(false);
    expect(validateInstrument({ ticker: "   ", name: "x", lotSize: 1, price: 1 }).ok).toBe(false);
  });

  it("rejects non-integer lotSize", () => {
    expect(validateInstrument({ ticker: "X", name: "x", lotSize: 1.5, price: 1 }).ok).toBe(false);
  });

  it("rejects lotSize < 1", () => {
    expect(validateInstrument({ ticker: "X", name: "x", lotSize: 0, price: 1 }).ok).toBe(false);
  });

  it("rejects price <= 0", () => {
    expect(validateInstrument({ ticker: "X", name: "x", lotSize: 1, price: 0 }).ok).toBe(false);
    expect(validateInstrument({ ticker: "X", name: "x", lotSize: 1, price: -1 }).ok).toBe(false);
  });

  it("rejects non-finite price", () => {
    expect(validateInstrument({ ticker: "X", name: "x", lotSize: 1, price: NaN }).ok).toBe(false);
    expect(validateInstrument({ ticker: "X", name: "x", lotSize: 1, price: Infinity }).ok).toBe(
      false,
    );
  });
});

describe("validatePosition", () => {
  it("accepts a valid position", () => {
    expect(validatePosition({ ticker: "SBER", quantity: 100 }).ok).toBe(true);
  });

  it("accepts zero quantity (target-only ticker)", () => {
    expect(validatePosition({ ticker: "SBER", quantity: 0 }).ok).toBe(true);
  });

  it("rejects negative or fractional quantity", () => {
    expect(validatePosition({ ticker: "X", quantity: -1 }).ok).toBe(false);
    expect(validatePosition({ ticker: "X", quantity: 0.5 }).ok).toBe(false);
  });
});

describe("validateTargetWeight", () => {
  it("accepts boundary values 0 and 100", () => {
    expect(validateTargetWeight({ ticker: "X", weightPercent: 0 }).ok).toBe(true);
    expect(validateTargetWeight({ ticker: "X", weightPercent: 100 }).ok).toBe(true);
  });

  it("rejects values outside [0, 100]", () => {
    expect(validateTargetWeight({ ticker: "X", weightPercent: -1 }).ok).toBe(false);
    expect(validateTargetWeight({ ticker: "X", weightPercent: 101 }).ok).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(validateTargetWeight({ ticker: "X", weightPercent: NaN }).ok).toBe(false);
  });
});

describe("weightsTotal", () => {
  it("returns 0 for empty list", () => {
    expect(weightsTotal([])).toBe(0);
  });

  it("sums weight percentages", () => {
    expect(
      weightsTotal([
        { ticker: "A", weightPercent: 30 },
        { ticker: "B", weightPercent: 70 },
      ]),
    ).toBe(100);
  });
});

describe("isWeightsValid", () => {
  it("rejects empty list", () => {
    expect(isWeightsValid([])).toBe(false);
  });

  it("accepts exactly 100", () => {
    expect(
      isWeightsValid([
        { ticker: "A", weightPercent: 50 },
        { ticker: "B", weightPercent: 50 },
      ]),
    ).toBe(true);
  });

  it("accepts within floating-point tolerance", () => {
    expect(
      isWeightsValid([
        { ticker: "A", weightPercent: 33.3334 },
        { ticker: "B", weightPercent: 33.3333 },
        { ticker: "C", weightPercent: 33.3333 },
      ]),
    ).toBe(true);
  });

  it("rejects 99.5", () => {
    expect(
      isWeightsValid([
        { ticker: "A", weightPercent: 50 },
        { ticker: "B", weightPercent: 49.5 },
      ]),
    ).toBe(false);
  });
});

describe("parsePersistedState", () => {
  it("parses a valid payload", () => {
    const raw = {
      _schemaVersion: 1,
      targetWeights: [{ ticker: "SBER", weightPercent: 60 }],
      instruments: [{ ticker: "SBER", name: "Сбер", lotSize: 10, price: 300 }],
    };
    const result = parsePersistedState(raw);
    expect(result).not.toBeNull();
    expect(result!.targetWeights).toHaveLength(1);
    expect(result!.instruments).toHaveLength(1);
  });

  it("returns null for null or non-object input", () => {
    expect(parsePersistedState(null)).toBeNull();
    expect(parsePersistedState(42)).toBeNull();
    expect(parsePersistedState("foo")).toBeNull();
  });

  it("returns null for missing or wrong schema version", () => {
    expect(parsePersistedState({ targetWeights: [], instruments: [] })).toBeNull();
    expect(
      parsePersistedState({ _schemaVersion: 2, targetWeights: [], instruments: [] }),
    ).toBeNull();
  });

  it("returns null when targetWeights or instruments are not arrays", () => {
    expect(
      parsePersistedState({ _schemaVersion: 1, targetWeights: {}, instruments: [] }),
    ).toBeNull();
    expect(
      parsePersistedState({ _schemaVersion: 1, targetWeights: [], instruments: {} }),
    ).toBeNull();
  });

  it("returns null when any item fails validation", () => {
    expect(
      parsePersistedState({
        _schemaVersion: 1,
        targetWeights: [{ ticker: "SBER", weightPercent: 200 }],
        instruments: [],
      }),
    ).toBeNull();
    expect(
      parsePersistedState({
        _schemaVersion: 1,
        targetWeights: [],
        instruments: [{ ticker: "X", name: "x", lotSize: 0, price: 1 }],
      }),
    ).toBeNull();
  });

  it("accepts empty arrays", () => {
    const result = parsePersistedState({
      _schemaVersion: 1,
      targetWeights: [],
      instruments: [],
    });
    expect(result).not.toBeNull();
    expect(result!.targetWeights).toEqual([]);
    expect(result!.instruments).toEqual([]);
  });
});
