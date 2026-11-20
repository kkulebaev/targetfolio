import { describe, expect, it } from "vitest";

import { mergeTinkoffPortfolios, sumFreeRub } from "./tinkoff-portfolio";
import type { TinkoffPortfolioPosition } from "./tinkoff";

function pos(
  figi: string,
  units: string,
  nano = 0,
  extra: Partial<TinkoffPortfolioPosition> = {},
): TinkoffPortfolioPosition {
  return { figi, instrumentType: "share", quantity: { units, nano }, ...extra };
}

const FIGI_TO_TICKER = new Map([
  ["FIGI_SBER", "SBER"],
  ["FIGI_GAZP", "GAZP"],
]);

describe("mergeTinkoffPortfolios", () => {
  it("sums quantities of the same instrument across accounts", () => {
    const result = mergeTinkoffPortfolios(
      [[pos("FIGI_SBER", "10"), pos("FIGI_GAZP", "5")], [pos("FIGI_SBER", "7")]],
      FIGI_TO_TICKER,
    );
    expect(result.positions).toEqual([
      { ticker: "SBER", quantity: 17 },
      { ticker: "GAZP", quantity: 5 },
    ]);
  });

  it("keeps fractional quantities exact instead of rounding them", () => {
    const result = mergeTinkoffPortfolios(
      [[pos("FIGI_SBER", "0", 100_000_000)], [pos("FIGI_SBER", "0", 200_000_000)]],
      FIGI_TO_TICKER,
    );
    expect(result.positions).toEqual([{ ticker: "SBER", quantity: 0.3 }]);
  });

  it("reports positions outside the catalog by ticker, merged across accounts", () => {
    const result = mergeTinkoffPortfolios(
      [
        [pos("FIGI_TMOS", "100", 0, { instrumentType: "etf", ticker: "TMOS" })],
        [pos("FIGI_TMOS", "20", 0, { instrumentType: "etf", ticker: "TMOS" })],
        [pos("FIGI_BOND", "3", 0, { instrumentType: "bond" })],
      ],
      FIGI_TO_TICKER,
    );
    expect(result.positions).toEqual([]);
    expect(result.skipped).toEqual([
      { key: "figi:FIGI_TMOS", label: "TMOS", instrumentType: "etf", quantity: 120 },
      { key: "figi:FIGI_BOND", label: "FIGI_BOND", instrumentType: "bond", quantity: 3 },
    ]);
  });

  it("never merges skipped positions that have no identifier", () => {
    const result = mergeTinkoffPortfolios(
      [
        [
          pos("", "1", 0, { instrumentType: "bond" }),
          pos("", "2", 0, { instrumentType: "etf" }),
          pos("", "3", 0, { instrumentType: "etf", ticker: "TMOS" }),
          pos("", "4", 0, { instrumentType: "etf", ticker: "TMOS" }),
        ],
      ],
      FIGI_TO_TICKER,
    );
    expect(result.skipped).toEqual([
      { key: "unknown:0", label: "без тикера", instrumentType: "bond", quantity: 1 },
      { key: "unknown:1", label: "без тикера", instrumentType: "etf", quantity: 2 },
      { key: "ticker:TMOS", label: "TMOS", instrumentType: "etf", quantity: 7 },
    ]);
  });

  it("ignores currencies and short or empty positions", () => {
    const result = mergeTinkoffPortfolios(
      [
        [
          pos("RUB000UTSTOM", "5000", 0, { instrumentType: "currency" }),
          pos("FIGI_SBER", "-10"),
          pos("FIGI_GAZP", "0"),
        ],
      ],
      FIGI_TO_TICKER,
    );
    expect(result).toEqual({ positions: [], skipped: [] });
  });
});

it("keeps precision for very large fractional quantities", () => {
  const result = mergeTinkoffPortfolios(
    [[pos("FIGI_SBER", "50000000", 100_000_000)], [pos("FIGI_SBER", "0", 200_000_000)]],
    FIGI_TO_TICKER,
  );
  expect(result.positions).toEqual([{ ticker: "SBER", quantity: 50_000_000.3 }]);
});

describe("sumFreeRub", () => {
  it("sums rouble balances across accounts and ignores other currencies", () => {
    const total = sumFreeRub([
      {
        money: [
          { currency: "rub", units: "1000", nano: 500_000_000 },
          { currency: "usd", units: "50", nano: 0 },
        ],
      },
      { money: [{ currency: "RUB", units: "250", nano: 0 }] },
      { money: [] },
    ]);
    expect(total).toBe(1250.5);
  });
});
