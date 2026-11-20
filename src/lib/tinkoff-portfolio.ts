import type { Position, Ticker } from "@/domain/types";
import { quotationToNumber, type TinkoffPortfolioPosition, type TinkoffPositions } from "./tinkoff";

export type SkippedPosition = {
  /** Merge identity across accounts; unique within the list. */
  key: string;
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
  const skippedByKey = new Map<string, SkippedPosition>();

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
      // FIGI can be omitted by the API; without any identifier a position is never merged,
      // since summing unrelated instruments would misreport both.
      const key = raw.figi
        ? `figi:${raw.figi}`
        : raw.ticker
          ? `ticker:${raw.ticker}`
          : `unknown:${skippedByKey.size}`;
      const existing = skippedByKey.get(key);
      if (existing) {
        existing.quantity = roundQuotation(existing.quantity + quantity);
      } else {
        skippedByKey.set(key, {
          key,
          label: raw.ticker || raw.figi || "без тикера",
          instrumentType: raw.instrumentType,
          quantity,
        });
      }
    }
  }

  return {
    positions: [...quantityByTicker].map(([ticker, quantity]) => ({ ticker, quantity })),
    skipped: [...skippedByKey.values()],
  };
}

export function sumFreeRub(accounts: readonly TinkoffPositions[]): number {
  let total = 0;
  for (const account of accounts) {
    for (const money of account.money) {
      if (money.currency.toLowerCase() !== "rub") continue;
      total += quotationToNumber(money);
    }
  }
  return Math.round(total * 100) / 100;
}
