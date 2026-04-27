import { describe, expect, it } from "vitest";

import {
  isWeightsValid,
  validatePosition,
  validateTargetWeight,
  weightsTotal,
} from "./validation";

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
