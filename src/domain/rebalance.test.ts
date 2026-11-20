import { describe, expect, it } from "vitest";

import { calculateBuys } from "./rebalance";
import type { Instrument, Position, TargetWeight, Ticker } from "./types";

function instruments(...items: Instrument[]): Map<Ticker, Instrument> {
  const map = new Map<Ticker, Instrument>();
  for (const item of items) map.set(item.ticker, item);
  return map;
}

const SBER: Instrument = { ticker: "SBER", name: "Сбербанк", lotSize: 10, price: 300 };
const GAZP: Instrument = { ticker: "GAZP", name: "Газпром", lotSize: 10, price: 150 };
const TMOS: Instrument = { ticker: "TMOS", name: "Тинькофф МосБиржа", lotSize: 1, price: 7 };

describe("calculateBuys", () => {
  it("returns empty result when target list is empty", () => {
    const result = calculateBuys(instruments(SBER), [], [], 10000);
    expect(result.recommendations).toEqual([]);
    expect(result.unusedCash).toBe(10000);
  });

  it("returns empty result and clamps unusedCash when cash is zero", () => {
    const result = calculateBuys(
      instruments(SBER),
      [],
      [{ ticker: "SBER", weightPercent: 100 }],
      0,
    );
    expect(result.recommendations).toEqual([]);
    expect(result.unusedCash).toBe(0);
  });

  it("clamps negative cash to zero", () => {
    const result = calculateBuys(
      instruments(SBER),
      [],
      [{ ticker: "SBER", weightPercent: 100 }],
      -500,
    );
    expect(result.recommendations).toEqual([]);
    expect(result.unusedCash).toBe(0);
  });

  it("returns empty recommendations when cash is smaller than the cheapest lot", () => {
    const targets: TargetWeight[] = [{ ticker: "SBER", weightPercent: 100 }];
    const result = calculateBuys(instruments(SBER), [], targets, 100);
    expect(result.recommendations).toEqual([]);
    expect(result.unusedCash).toBe(100);
  });

  it("buys integer lots respecting lotSize and never exceeds available cash", () => {
    const targets: TargetWeight[] = [{ ticker: "SBER", weightPercent: 100 }];
    const result = calculateBuys(instruments(SBER), [], targets, 10000);
    const lotCost = SBER.lotSize * SBER.price;
    expect(result.recommendations).toHaveLength(1);
    const rec = result.recommendations[0]!;
    expect(rec.ticker).toBe("SBER");
    expect(rec.lotsToBuy).toBe(3);
    expect(rec.sharesToBuy).toBe(rec.lotsToBuy * SBER.lotSize);
    expect(rec.estimatedCost).toBe(rec.lotsToBuy * lotCost);
    expect(rec.estimatedCost + result.unusedCash).toBe(10000);
    expect(result.unusedCash).toBeGreaterThanOrEqual(0);
  });

  it("treats a target ticker absent from positions as quantity zero", () => {
    const targets: TargetWeight[] = [{ ticker: "SBER", weightPercent: 100 }];
    const result = calculateBuys(instruments(SBER), [], targets, 6000);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]!.lotsToBuy).toBe(2);
  });

  it("skips target tickers without a registered instrument", () => {
    const targets: TargetWeight[] = [
      { ticker: "SBER", weightPercent: 50 },
      { ticker: "UNKNOWN", weightPercent: 50 },
    ];
    const result = calculateBuys(instruments(SBER), [], targets, 6000);
    expect(result.recommendations.every((r) => r.ticker !== "UNKNOWN")).toBe(true);
  });

  it("greedily picks the most underweighted ticker first", () => {
    const positions: Position[] = [{ ticker: "SBER", quantity: 30 }];
    const targets: TargetWeight[] = [
      { ticker: "SBER", weightPercent: 50 },
      { ticker: "GAZP", weightPercent: 50 },
    ];
    const result = calculateBuys(instruments(SBER, GAZP), positions, targets, 3000);
    const gazpRec = result.recommendations.find((r) => r.ticker === "GAZP");
    const sberRec = result.recommendations.find((r) => r.ticker === "SBER");
    expect(gazpRec).toBeDefined();
    expect(sberRec).toBeUndefined();
    expect(gazpRec!.estimatedCost).toBe(2 * GAZP.lotSize * GAZP.price);
  });

  it("distributes cash proportionally when current portfolio matches target", () => {
    const positions: Position[] = [
      { ticker: "SBER", quantity: 10 },
      { ticker: "GAZP", quantity: 20 },
    ];
    const targets: TargetWeight[] = [
      { ticker: "SBER", weightPercent: 50 },
      { ticker: "GAZP", weightPercent: 50 },
    ];
    const result = calculateBuys(instruments(SBER, GAZP), positions, targets, 6000);
    const sberRec = result.recommendations.find((r) => r.ticker === "SBER");
    const gazpRec = result.recommendations.find((r) => r.ticker === "GAZP");
    expect(sberRec).toBeDefined();
    expect(gazpRec).toBeDefined();
    const totalSpent = result.recommendations.reduce((s, r) => s + r.estimatedCost, 0);
    expect(totalSpent + result.unusedCash).toBe(6000);
  });

  it("respects lotSize > 1 and produces sharesToBuy as integer multiple", () => {
    const targets: TargetWeight[] = [{ ticker: "SBER", weightPercent: 100 }];
    const result = calculateBuys(instruments(SBER), [], targets, 30001);
    for (const rec of result.recommendations) {
      expect(Number.isInteger(rec.lotsToBuy)).toBe(true);
      expect(rec.lotsToBuy).toBeGreaterThan(0);
      expect(rec.sharesToBuy).toBe(rec.lotsToBuy * SBER.lotSize);
    }
  });

  it("does not exceed available cash across all recommendations", () => {
    const targets: TargetWeight[] = [
      { ticker: "SBER", weightPercent: 30 },
      { ticker: "GAZP", weightPercent: 30 },
      { ticker: "TMOS", weightPercent: 40 },
    ];
    const result = calculateBuys(instruments(SBER, GAZP, TMOS), [], targets, 25000);
    const totalSpent = result.recommendations.reduce((s, r) => s + r.estimatedCost, 0);
    expect(totalSpent).toBeLessThanOrEqual(25000);
    expect(totalSpent + result.unusedCash).toBeCloseTo(25000, 6);
  });

  it("returns zero recommendations when portfolio already matches target and cash is below cheapest lot", () => {
    const positions: Position[] = [
      { ticker: "SBER", quantity: 10 },
      { ticker: "GAZP", quantity: 20 },
    ];
    const targets: TargetWeight[] = [
      { ticker: "SBER", weightPercent: 50 },
      { ticker: "GAZP", weightPercent: 50 },
    ];
    const result = calculateBuys(instruments(SBER, GAZP), positions, targets, 100);
    expect(result.recommendations).toEqual([]);
    expect(result.unusedCash).toBe(100);
  });

  it("aggregates multiple lot purchases of the same ticker into one recommendation", () => {
    const targets: TargetWeight[] = [{ ticker: "TMOS", weightPercent: 100 }];
    const result = calculateBuys(instruments(TMOS), [], targets, 100);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]!.ticker).toBe("TMOS");
    expect(result.recommendations[0]!.lotsToBuy).toBe(14);
    expect(result.recommendations[0]!.sharesToBuy).toBe(14);
  });
  it("skips an expensive lot that would overshoot its target more than it is short", () => {
    const BIG: Instrument = { ticker: "BIG", name: "Big", lotSize: 1, price: 10000 };
    const SMALL: Instrument = { ticker: "SMALL", name: "Small", lotSize: 1, price: 100 };
    const targets: TargetWeight[] = [
      { ticker: "BIG", weightPercent: 50 },
      { ticker: "SMALL", weightPercent: 50 },
    ];
    const result = calculateBuys(instruments(BIG, SMALL), [], targets, 10000);
    expect(result.recommendations).toEqual([
      { ticker: "SMALL", lotsToBuy: 50, sharesToBuy: 50, estimatedCost: 5000 },
    ]);
    expect(result.unusedCash).toBe(5000);
  });

  it("ignores instruments with a non-positive lot cost instead of looping forever", () => {
    const FREE: Instrument = { ticker: "FREE", name: "Free", lotSize: 1, price: 0 };
    const targets: TargetWeight[] = [
      { ticker: "FREE", weightPercent: 50 },
      { ticker: "TMOS", weightPercent: 50 },
    ];
    const result = calculateBuys(instruments(FREE, TMOS), [], targets, 70);
    expect(result.recommendations.map((r) => r.ticker)).toEqual(["TMOS"]);
  });

  describe("holdings outside the target", () => {
    const AAA: Instrument = { ticker: "AAA", name: "A", lotSize: 1, price: 100 };
    const BBB: Instrument = { ticker: "BBB", name: "B", lotSize: 1, price: 100 };
    const OTHER: Instrument = { ticker: "OTHER", name: "Other", lotSize: 1, price: 100 };
    const all = instruments(AAA, BBB, OTHER);
    const positions: Position[] = [
      { ticker: "AAA", quantity: 8 },
      { ticker: "OTHER", quantity: 100 },
    ];
    const targets: TargetWeight[] = [
      { ticker: "AAA", weightPercent: 80 },
      { ticker: "BBB", weightPercent: 20 },
    ];

    it("are ignored by default, so weights are relative to the target tickers only", () => {
      // AAA is 800 of the 900 target-only total, already above its 80%.
      const result = calculateBuys(all, positions, targets, 100);
      expect(result.recommendations.map((r) => r.ticker)).toEqual(["BBB"]);
    });

    it("count toward the total when includeNonTarget is on, but are never bought", () => {
      // Against the 10 900 whole-portfolio total AAA is far below 80%.
      const result = calculateBuys(all, positions, targets, 100, { includeNonTarget: true });
      expect(result.recommendations.map((r) => r.ticker)).toEqual(["AAA"]);
    });

    it("skip non-target positions without a registered instrument", () => {
      const withUnknown: Position[] = [...positions, { ticker: "UNKNOWN", quantity: 1000 }];
      const result = calculateBuys(all, withUnknown, targets, 100, { includeNonTarget: true });
      expect(result.recommendations.map((r) => r.ticker)).toEqual(["AAA"]);
    });
  });
});
