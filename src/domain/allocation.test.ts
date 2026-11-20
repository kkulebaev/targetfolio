import { describe, expect, it } from "vitest";

import { compareAllocation } from "./allocation";
import { calculateBuys } from "./rebalance";
import type { BuyRecommendation, Instrument, Position, TargetWeight, Ticker } from "./types";

function instruments(...items: Instrument[]): Map<Ticker, Instrument> {
  return new Map(items.map((i) => [i.ticker, i]));
}

const AAA: Instrument = { ticker: "AAA", name: "A", lotSize: 1, price: 100 };
const BBB: Instrument = { ticker: "BBB", name: "B", lotSize: 1, price: 100 };
const OTHER: Instrument = { ticker: "OTHER", name: "Other", lotSize: 1, price: 100 };
const ALL = instruments(AAA, BBB, OTHER);

const TARGETS: TargetWeight[] = [
  { ticker: "AAA", weightPercent: 50 },
  { ticker: "BBB", weightPercent: 50 },
];

function buy(ticker: Ticker, shares: number, price = 100): BuyRecommendation {
  return { ticker, lotsToBuy: shares, sharesToBuy: shares, estimatedCost: shares * price };
}

describe("compareAllocation", () => {
  it("computes weights of invested value before and after buying, ignoring idle cash", () => {
    const positions: Position[] = [{ ticker: "AAA", quantity: 6 }];
    const result = compareAllocation(ALL, positions, TARGETS, [buy("BBB", 4)]);
    expect(result.rows).toEqual([
      { ticker: "AAA", targetPercent: 50, currentPercent: 100, afterPercent: 60 },
      { ticker: "BBB", targetPercent: 50, currentPercent: 0, afterPercent: 40 },
    ]);
    // Before: |100−50| + |0−50| = 100 → 50%. After: |60−50| + |40−50| = 20 → 10%.
    expect(result.deviationBefore).toBe(50);
    expect(result.deviationAfter).toBe(10);
  });

  it("reports zero deviation when the portfolio matches the target", () => {
    const positions: Position[] = [
      { ticker: "AAA", quantity: 5 },
      { ticker: "BBB", quantity: 5 },
    ];
    const result = compareAllocation(ALL, positions, TARGETS, []);
    expect(result.deviationBefore).toBe(0);
    expect(result.deviationAfter).toBe(0);
  });

  it("has no before weights for an empty portfolio", () => {
    const result = compareAllocation(ALL, [], TARGETS, [buy("AAA", 1), buy("BBB", 1)]);
    expect(result.rows.map((r) => r.currentPercent)).toEqual([null, null]);
    expect(result.deviationBefore).toBeNull();
    expect(result.deviationAfter).toBe(0);
  });

  it("ignores holdings outside the target by default", () => {
    const positions: Position[] = [
      { ticker: "AAA", quantity: 5 },
      { ticker: "BBB", quantity: 5 },
      { ticker: "OTHER", quantity: 10 },
    ];
    const result = compareAllocation(ALL, positions, TARGETS, []);
    expect(result.nonTargetBefore).toBeNull();
    expect(result.deviationBefore).toBe(0);
  });

  it("counts holdings outside the target as misplaced weight with includeNonTarget", () => {
    const positions: Position[] = [
      { ticker: "AAA", quantity: 5 },
      { ticker: "BBB", quantity: 5 },
      { ticker: "OTHER", quantity: 10 },
    ];
    const result = compareAllocation(ALL, positions, TARGETS, [buy("AAA", 5), buy("BBB", 5)], {
      includeNonTarget: true,
    });
    expect(result.rows.map((r) => r.currentPercent)).toEqual([25, 25]);
    expect(result.nonTargetBefore).toBe(50);
    expect(result.nonTargetAfter).toBeCloseTo(100 / 3, 9);
    // Before: (25 + 25 + 50) / 2 = 50. After: weights 1/3 each → (2·(50−33.3) + 33.3) / 2.
    expect(result.deviationBefore).toBe(50);
    expect(result.deviationAfter).toBeCloseTo(100 / 3, 9);
  });

  it("counts a duplicated target ticker once", () => {
    const positions: Position[] = [{ ticker: "AAA", quantity: 5 }];
    const result = compareAllocation(ALL, positions, [...TARGETS, TARGETS[0]!], []);
    expect(result.rows.map((r) => r.ticker)).toEqual(["AAA", "BBB"]);
    expect(result.rows[0]!.currentPercent).toBe(100);
  });

  it("skips targets without a registered instrument", () => {
    const targets: TargetWeight[] = [...TARGETS, { ticker: "UNKNOWN", weightPercent: 0 }];
    const result = compareAllocation(ALL, [], targets, []);
    expect(result.rows.map((r) => r.ticker)).toEqual(["AAA", "BBB"]);
  });

  it("reduces deviation for typical calculateBuys results", () => {
    const SBER: Instrument = { ticker: "SBER", name: "S", lotSize: 10, price: 300 };
    const GAZP: Instrument = { ticker: "GAZP", name: "G", lotSize: 10, price: 150 };
    const LKOH: Instrument = { ticker: "LKOH", name: "L", lotSize: 1, price: 7000 };
    const map = instruments(SBER, GAZP, LKOH);
    const positions: Position[] = [
      { ticker: "SBER", quantity: 100 },
      { ticker: "GAZP", quantity: 50 },
    ];
    const targets: TargetWeight[] = [
      { ticker: "SBER", weightPercent: 40 },
      { ticker: "GAZP", weightPercent: 30 },
      { ticker: "LKOH", weightPercent: 30 },
    ];
    for (const cash of [1000, 7500, 20000, 100000]) {
      const { recommendations } = calculateBuys(map, positions, targets, cash);
      const result = compareAllocation(map, positions, targets, recommendations);
      expect(result.deviationAfter!).toBeLessThanOrEqual(result.deviationBefore! + 1e-9);
    }
  });
});
