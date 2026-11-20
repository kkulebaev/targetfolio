import type {
  BuyRecommendation,
  Instrument,
  Position,
  RebalanceResult,
  TargetWeight,
  Ticker,
} from "./types";

export type CalculateBuysOptions = {
  /**
   * Off: target weights are shares of the target tickers' value only, so holdings outside
   * the target are invisible. On: weights are shares of the whole portfolio; holdings outside
   * the target still count toward its total value but are never bought.
   */
  includeNonTarget?: boolean;
};

/**
 * Greedy lot-by-lot descent on the sum of squared value deviations Σ(vᵢ − tᵢ)².
 * Buying a lot of cost c for a ticker with deficit d = tᵢ − vᵢ changes that sum by
 * c² − 2cd, so a lot only helps while c < 2d. Ranking by the raw deficit instead
 * would buy an expensive lot that overshoots the target further than it was short.
 * Unspent cash is part of the total, so leaving it idle is itself a deviation.
 */
export function calculateBuys(
  instruments: ReadonlyMap<Ticker, Instrument>,
  positions: readonly Position[],
  targets: readonly TargetWeight[],
  cash: number,
  options: CalculateBuysOptions = {},
): RebalanceResult {
  if (!Number.isFinite(cash) || cash <= 0 || targets.length === 0) {
    return { recommendations: [], unusedCash: Math.max(0, cash) };
  }

  const quantityByTicker = new Map<Ticker, number>();
  for (const position of positions) {
    quantityByTicker.set(
      position.ticker,
      (quantityByTicker.get(position.ticker) ?? 0) + position.quantity,
    );
  }

  const currentValue = new Map<Ticker, number>();
  for (const target of targets) {
    const instrument = instruments.get(target.ticker);
    if (!instrument) continue;
    currentValue.set(target.ticker, (quantityByTicker.get(target.ticker) ?? 0) * instrument.price);
  }

  let totalCurrent = 0;
  for (const value of currentValue.values()) totalCurrent += value;
  if (options.includeNonTarget) {
    for (const [ticker, quantity] of quantityByTicker) {
      if (currentValue.has(ticker)) continue;
      const instrument = instruments.get(ticker);
      if (!instrument) continue;
      totalCurrent += quantity * instrument.price;
    }
  }
  const totalValue = totalCurrent + cash;

  const lotsBought = new Map<Ticker, number>();
  let remainingCash = cash;

  while (true) {
    let bestTicker: Ticker | null = null;
    let bestLotCost = 0;
    let bestGain = 0;

    for (const target of targets) {
      const instrument = instruments.get(target.ticker);
      if (!instrument) continue;
      const lotCost = instrument.lotSize * instrument.price;
      if (!(lotCost > 0) || lotCost > remainingCash) continue;
      const targetValue = (totalValue * target.weightPercent) / 100;
      const deficit = targetValue - (currentValue.get(target.ticker) ?? 0);
      const gain = lotCost * (2 * deficit - lotCost);
      if (gain > bestGain) {
        bestGain = gain;
        bestLotCost = lotCost;
        bestTicker = target.ticker;
      }
    }

    if (bestTicker === null) break;

    lotsBought.set(bestTicker, (lotsBought.get(bestTicker) ?? 0) + 1);
    currentValue.set(bestTicker, (currentValue.get(bestTicker) ?? 0) + bestLotCost);
    remainingCash -= bestLotCost;
  }

  const recommendations: BuyRecommendation[] = [];
  for (const [ticker, lots] of lotsBought) {
    const instrument = instruments.get(ticker);
    if (!instrument) continue;
    recommendations.push({
      ticker,
      lotsToBuy: lots,
      sharesToBuy: lots * instrument.lotSize,
      estimatedCost: lots * instrument.lotSize * instrument.price,
    });
  }

  return { recommendations, unusedCash: remainingCash };
}
