import type { Position, Ticker } from "@/domain/types";
import { quotationToNumber, type TinkoffPortfolioPosition, type TinkoffPositions } from "./tinkoff";

export type SkippedPosition = {
  figi: string;
  /** Ticker reported by T-Invest, or FIGI when the API did not send one. */
  label: string;
  instrumentType: string;
  quantity: number;
};

export type MergedPortfolio = {
  positions: Position[];
  skipped: SkippedPosition[];
};

// Quotations carry 9 fractional digits, but a double holding tens of millions of shares keeps
// only ~8, so the sum is rounded to the 6 digits the UI shows.
function roundQuotation(value: number): number {
  return Number(value.toFixed(6));
}

/**
 * Merges portfolios of one or more accounts into catalog positions. Quantities stay exact
 * (no rounding to whole shares), and positions outside the catalog are reported instead of
 * silently dropped. Short positions (quantity <= 0) are ignored: the app only plans buys.
 */
export function mergeTinkoffPortfolios(
  portfolios: readonly (readonly TinkoffPortfolioPosition[])[],
  figiToTicker: ReadonlyMap<string, Ticker>,
): MergedPortfolio {
  const quantityByTicker = new Map<Ticker, number>();
  const skippedByFigi = new Map<string, SkippedPosition>();

  for (const portfolio of portfolios) {
    for (const raw of portfolio) {
      if (raw.instrumentType === "currency") continue;
      const quantity = quotationToNumber(raw.quantity);
      if (!(quantity > 0)) continue;

      const ticker = figiToTicker.get(raw.figi);
      if (ticker) {
        quantityByTicker.set(
          ticker,
          roundQuotation((quantityByTicker.get(ticker) ?? 0) + quantity),
        );
        continue;
      }
      const existing = skippedByFigi.get(raw.figi);
      if (existing) {
        existing.quantity = roundQuotation(existing.quantity + quantity);
      } else {
        skippedByFigi.set(raw.figi, {
          figi: raw.figi,
          label: raw.ticker || raw.figi,
          instrumentType: raw.instrumentType,
          quantity,
        });
      }
    }
  }

  return {
    positions: [...quantityByTicker].map(([ticker, quantity]) => ({ ticker, quantity })),
    skipped: [...skippedByFigi.values()],
  };
}

export function sumFreeRub(accounts: readonly TinkoffPositions[]): number {
  let total = 0;
  for (const account of accounts) {
    for (const money of account.money ?? []) {
      if (money.currency.toLowerCase() !== "rub") continue;
      total += quotationToNumber(money);
    }
  }
  return Math.round(total * 100) / 100;
}
