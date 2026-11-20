import { describe, expect, it } from "vitest";

import {
  parseAccountsResponse,
  parsePortfolioResponse,
  parsePositionsResponse,
  TinkoffResponseError,
} from "./tinkoff-schema";

describe("parseAccountsResponse", () => {
  it("parses accounts and defaults omitted proto3 fields", () => {
    expect(
      parseAccountsResponse({
        accounts: [{ id: "1", name: "Брокерский", status: "ACCOUNT_STATUS_OPEN" }, { id: "2" }],
      }),
    ).toEqual([
      { id: "1", type: "", name: "Брокерский", status: "ACCOUNT_STATUS_OPEN" },
      { id: "2", type: "", name: "", status: "" },
    ]);
  });

  it("treats an omitted accounts array as empty", () => {
    expect(parseAccountsResponse({})).toEqual([]);
  });

  it("rejects an account without an id", () => {
    expect(() => parseAccountsResponse({ accounts: [{ name: "x" }] })).toThrow("accounts[0].id");
  });

  it("rejects a non-object response", () => {
    expect(() => parseAccountsResponse("oops")).toThrow(TinkoffResponseError);
    expect(() => parseAccountsResponse(null)).toThrow(TinkoffResponseError);
  });
});

describe("parsePortfolioResponse", () => {
  it("parses positions, accepting int64 units as string or number and omitted nano", () => {
    expect(
      parsePortfolioResponse({
        positions: [
          {
            figi: "F1",
            instrumentType: "share",
            ticker: "SBER",
            quantity: { units: "10" },
            currentPrice: { currency: "rub", units: "300", nano: 0 },
          },
          { figi: "F2", instrumentType: "etf", quantity: { units: 3, nano: 500_000_000 } },
        ],
      }),
    ).toEqual([
      { figi: "F1", instrumentType: "share", ticker: "SBER", quantity: { units: "10", nano: 0 } },
      { figi: "F2", instrumentType: "etf", quantity: { units: "3", nano: 500_000_000 } },
    ]);
  });

  it("accepts int32 nano encoded as a string", () => {
    expect(
      parsePortfolioResponse({ positions: [{ quantity: { units: "1", nano: "500000000" } }] })[0]!
        .quantity,
    ).toEqual({ units: "1", nano: 500_000_000 });
  });

  it("treats an omitted quantity as zero", () => {
    expect(parsePortfolioResponse({ positions: [{ figi: "F" }] })[0]!.quantity).toEqual({
      units: "0",
      nano: 0,
    });
  });

  it("points at the malformed field", () => {
    expect(() =>
      parsePortfolioResponse({ positions: [{ figi: "F", quantity: { units: "1.5" } }] }),
    ).toThrow("positions[0].quantity.units");
    expect(() => parsePortfolioResponse({ positions: [{ figi: 42 }] })).toThrow(
      "positions[0].figi",
    );
    expect(() => parsePortfolioResponse({ positions: {} })).toThrow("ответ.positions");
    expect(() =>
      parsePortfolioResponse({ positions: [{ quantity: { units: "1", nano: 0.5 } }] }),
    ).toThrow("positions[0].quantity.nano");
  });
});

describe("parsePositionsResponse", () => {
  it("parses money balances and defaults an omitted list", () => {
    expect(
      parsePositionsResponse({ money: [{ currency: "rub", units: "100", nano: 250_000_000 }] }),
    ).toEqual({ money: [{ currency: "rub", units: "100", nano: 250_000_000 }] });
    expect(parsePositionsResponse({})).toEqual({ money: [] });
  });

  it("rejects malformed money entries", () => {
    expect(() => parsePositionsResponse({ money: [{ currency: 1 }] })).toThrow("money[0].currency");
  });
});
