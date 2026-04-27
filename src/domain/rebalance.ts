import type {
  BuyRecommendation,
  Instrument,
  Position,
  RebalanceResult,
  TargetWeight,
  Ticker,
} from "./types";

export function calculateBuys(
  instruments: ReadonlyMap<Ticker, Instrument>,
  positions: readonly Position[],
  targets: readonly TargetWeight[],
  cash: number,
): RebalanceResult {
  if (!Number.isFinite(cash) || cash <= 0 || targets.length === 0) {
    return { recommendations: [], unusedCash: Math.max(0, cash) };
  }

  const currentValue = new Map<Ticker, number>();
  for (const target of targets) {
    const instrument = instruments.get(target.ticker);
    if (!instrument) continue;
    const position = positions.find((p) => p.ticker === target.ticker);
    const qty = position?.quantity ?? 0;
    currentValue.set(target.ticker, qty * instrument.price);
  }

  let totalCurrent = 0;
  for (const value of currentValue.values()) totalCurrent += value;
  const totalValue = totalCurrent + cash;

  const lotsBought = new Map<Ticker, number>();
  let remainingCash = cash;

  while (true) {
    let bestTicker: Ticker | null = null;
    let bestDeficit = -Infinity;

    for (const target of targets) {
      const instrument = instruments.get(target.ticker);
      if (!instrument) continue;
      const lotCost = instrument.lotSize * instrument.price;
      if (lotCost > remainingCash) continue;
      const targetValue = (totalValue * target.weightPercent) / 100;
      const current = currentValue.get(target.ticker) ?? 0;
      const deficit = targetValue - current;
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestTicker = target.ticker;
      }
    }

    if (bestTicker === null || bestDeficit <= 0) break;

    const instrument = instruments.get(bestTicker);
    if (!instrument) break;
    const lotCost = instrument.lotSize * instrument.price;
    lotsBought.set(bestTicker, (lotsBought.get(bestTicker) ?? 0) + 1);
    currentValue.set(bestTicker, (currentValue.get(bestTicker) ?? 0) + lotCost);
    remainingCash -= lotCost;
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
