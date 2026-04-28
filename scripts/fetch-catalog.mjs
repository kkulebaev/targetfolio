#!/usr/bin/env node
import { writeFileSync } from "node:fs";

const TOKEN = process.env.TINKOFF_TOKEN;
if (!TOKEN) {
  console.error("Set TINKOFF_TOKEN env var with a read-only T-Invest token");
  process.exit(1);
}

const BASE_URL = "https://invest-public-api.tinkoff.ru/rest";
const SERVICE_PREFIX = "tinkoff.public.invest.api.contract.v1";
const OUTPUT_PATH = "src/catalog/instruments.json";

async function call(service, method, body) {
  const res = await fetch(`${BASE_URL}/${SERVICE_PREFIX}.${service}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${service}/${method} HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

function quotationToNumber(q) {
  if (!q) throw new Error("Missing quotation");
  const units = Number(q.units);
  if (!Number.isFinite(units)) throw new Error(`Invalid quotation units: ${q.units}`);
  const nano = Number(q.nano ?? 0);
  return units + nano / 1e9;
}

const sharesRes = await call("InstrumentsService", "Shares", {
  instrumentStatus: "INSTRUMENT_STATUS_BASE",
});
const shares = sharesRes.instruments ?? [];

const filtered = shares.filter(
  (s) =>
    s.currency === "rub" &&
    s.apiTradeAvailableFlag === true &&
    s.forQualInvestorFlag !== true &&
    typeof s.exchange === "string" &&
    s.exchange.toUpperCase().startsWith("MOEX") &&
    typeof s.figi === "string" &&
    s.figi.length > 0 &&
    typeof s.ticker === "string" &&
    s.ticker.length > 0,
);

if (filtered.length === 0) throw new Error("No shares matched filters");

const figis = filtered.map((s) => s.figi);
const pricesRes = await call("MarketDataService", "GetClosePrices", {
  instruments: figis.map((figi) => ({ instrumentId: figi })),
});
const closePrices = pricesRes.closePrices ?? [];

const priceByFigi = new Map();
for (const cp of closePrices) {
  if (!cp.figi || !cp.price) continue;
  priceByFigi.set(cp.figi, quotationToNumber(cp.price));
}

const items = [];
for (const s of filtered) {
  const price = priceByFigi.get(s.figi);
  if (price === undefined) {
    throw new Error(`Missing close price for ${s.ticker} (${s.figi})`);
  }
  const lotSize = Number(s.lot);
  if (!Number.isFinite(lotSize) || lotSize <= 0) {
    throw new Error(`Invalid lot for ${s.ticker}: ${s.lot}`);
  }
  items.push({
    ticker: s.ticker,
    name: s.name,
    lotSize,
    price,
    figi: s.figi,
    currency: s.currency,
  });
}

items.sort((a, b) => a.ticker.localeCompare(b.ticker));

writeFileSync(OUTPUT_PATH, `${JSON.stringify(items, null, 2)}\n`);
console.log(`Wrote ${items.length} instruments to ${OUTPUT_PATH}`);
