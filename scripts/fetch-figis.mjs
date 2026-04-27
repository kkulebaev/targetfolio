#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const TOKEN = process.env.TINKOFF_TOKEN;
if (!TOKEN) {
  console.error("Set TINKOFF_TOKEN env var with a read-only T-Invest token");
  process.exit(1);
}

const CATALOG_PATH = "src/catalog/instruments.ts";
const OUTPUT_PATH = "src/catalog/figis.json";

const catalogSource = readFileSync(CATALOG_PATH, "utf8");
const tickers = [...catalogSource.matchAll(/ticker:\s*"([^"]+)"/g)].map((m) => m[1]);
if (tickers.length === 0) {
  console.error(`Could not extract tickers from ${CATALOG_PATH}`);
  process.exit(1);
}

const ENDPOINT =
  "https://invest-public-api.tinkoff.ru/rest/tinkoff.public.invest.api.contract.v1.InstrumentsService/Shares";

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ instrumentStatus: "INSTRUMENT_STATUS_BASE" }),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const { instruments = [] } = await res.json();
const wanted = new Set(tickers);
const found = {};
for (const inst of instruments) {
  if (wanted.has(inst.ticker) && inst.figi) found[inst.ticker] = inst.figi;
}

const sorted = Object.fromEntries(Object.entries(found).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`);

const missing = tickers.filter((t) => !found[t]);
console.log(`Wrote ${Object.keys(sorted).length} FIGIs to ${OUTPUT_PATH}`);
if (missing.length > 0) console.log(`Missing FIGI for: ${missing.join(", ")}`);
