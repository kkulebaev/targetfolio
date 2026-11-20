import type { CalculateBuysOptions } from "./rebalance";
import type { BuyRecommendation, Instrument, Position, TargetWeight, Ticker } from "./types";

export type AllocationRow = {
  ticker: Ticker;
  targetPercent: number;
  /** null when the portfolio is empty before buying, so there is no weight to show. */
  currentPercent: number | null;
  afterPercent: number | null;
};

export type AllocationComparison = {
  rows: AllocationRow[];
  nonTargetBefore: number | null;
  nonTargetAfter: number | null;
  // Half the sum of |weight − target|, so it reads as the share of the portfolio to move.
  deviationBefore: number | null;
  deviationAfter: number | null;
};

/**
 * Weights are shares of invested value, not of value plus cash: idle cash would otherwise
 * make every "before" weight look underweight. Holdings outside the target enter the base
 * only with includeNonTarget, mirroring calculateBuys, and then count as weight that
 * should be 0%.
 */
export function compareAllocation(
  instruments: ReadonlyMap<Ticker, Instrument>,
  positions: readonly Position[],
  targets: readonly TargetWeight[],
  recommendations: readonly BuyRecommendation[],
  options: CalculateBuysOptions = {},
): AllocationComparison {
  const quantityByTicker = new Map<Ticker, number>();
  for (const p of positions) {
    quantityByTicker.set(p.ticker, (quantityByTicker.get(p.ticker) ?? 0) + p.quantity);
  }
  const boughtByTicker = new Map<Ticker, number>();
  for (const r of recommendations) {
    boughtByTicker.set(r.ticker, (boughtByTicker.get(r.ticker) ?? 0) + r.estimatedCost);
  }

  const targetTickers = new Set<Ticker>();
  const known: { target: TargetWeight; before: number; after: number }[] = [];
  for (const target of targets) {
    const instrument = instruments.get(target.ticker);
    if (!instrument || targetTickers.has(target.ticker)) continue;
    targetTickers.add(target.ticker);
    const before = (quantityByTicker.get(target.ticker) ?? 0) * instrument.price;
    known.push({ target, before, after: before + (boughtByTicker.get(target.ticker) ?? 0) });
  }

  let nonTargetValue = 0;
  if (options.includeNonTarget) {
    for (const [ticker, quantity] of quantityByTicker) {
      if (targetTickers.has(ticker)) continue;
      const instrument = instruments.get(ticker);
      if (instrument) nonTargetValue += quantity * instrument.price;
    }
  }

  let totalBefore = nonTargetValue;
  let totalAfter = nonTargetValue;
  for (const k of known) {
    totalBefore += k.before;
    totalAfter += k.after;
  }

  const share = (value: number, total: number) => (total > 0 ? (value / total) * 100 : null);

  const rows: AllocationRow[] = known.map((k) => ({
    ticker: k.target.ticker,
    targetPercent: k.target.weightPercent,
    currentPercent: share(k.before, totalBefore),
    afterPercent: share(k.after, totalAfter),
  }));

  const nonTargetBefore = options.includeNonTarget ? share(nonTargetValue, totalBefore) : null;
  const nonTargetAfter = options.includeNonTarget ? share(nonTargetValue, totalAfter) : null;

  function deviation(pick: (row: AllocationRow) => number | null, nonTarget: number | null) {
    let sum = nonTarget ?? 0;
    for (const row of rows) {
      const weight = pick(row);
      if (weight === null) return null;
      sum += Math.abs(weight - row.targetPercent);
    }
    return sum / 2;
  }

  return {
    rows,
    nonTargetBefore,
    nonTargetAfter,
    deviationBefore: deviation((r) => r.currentPercent, nonTargetBefore),
    deviationAfter: deviation((r) => r.afterPercent, nonTargetAfter),
  };
}
