#!/usr/bin/env node
import { writeFileSync } from "node:fs";

const INDICES = [
  { code: "IMOEX", name: "Индекс МосБиржи" },
  { code: "MOEXBC", name: "Индекс голубых фишек" },
  { code: "MOEXBMI", name: "Индекс широкого рынка" },
];

const OUTPUT_PATH = "src/catalog/indices.json";

async function fetchIndex(code) {
  const url = `https://iss.moex.com/iss/statistics/engines/stock/markets/index/analytics/${code}.json?limit=100`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`ISS ${code} HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const block = json.analytics;
  if (!block || !Array.isArray(block.columns) || !Array.isArray(block.data)) {
    throw new Error(`ISS ${code}: unexpected response shape`);
  }
  const cols = block.columns;
  const idx = {
    ticker: cols.indexOf("ticker"),
    weight: cols.indexOf("weight"),
    tradedate: cols.indexOf("tradedate"),
    tradingsession: cols.indexOf("tradingsession"),
  };
  for (const [key, value] of Object.entries(idx)) {
    if (value < 0) throw new Error(`ISS ${code}: column "${key}" missing`);
  }

  const rows = block.data;
  if (rows.length === 0) throw new Error(`ISS ${code}: empty data`);

  let latestDate = "";
  for (const row of rows) {
    const d = row[idx.tradedate];
    if (typeof d === "string" && d > latestDate) latestDate = d;
  }
  if (!latestDate) throw new Error(`ISS ${code}: no tradedate values`);

  const onLatest = rows.filter((r) => r[idx.tradedate] === latestDate);
  let maxSession = -Infinity;
  for (const r of onLatest) {
    const s = Number(r[idx.tradingsession]);
    if (Number.isFinite(s) && s > maxSession) maxSession = s;
  }
  const onLatestSession = onLatest.filter(
    (r) => Number(r[idx.tradingsession]) === maxSession,
  );

  const byTicker = new Map();
  for (const r of onLatestSession) {
    const ticker = r[idx.ticker];
    const weight = Number(r[idx.weight]);
    if (typeof ticker !== "string" || ticker.length === 0) continue;
    if (!Number.isFinite(weight)) continue;
    byTicker.set(ticker, weight);
  }
  if (byTicker.size === 0) throw new Error(`ISS ${code}: no constituents parsed`);

  const constituents = Array.from(byTicker.entries())
    .map(([ticker, weight]) => ({ ticker, weight }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  return { fetchedAt: latestDate, constituents };
}

const result = [];
for (const { code, name } of INDICES) {
  const { fetchedAt, constituents } = await fetchIndex(code);
  result.push({ code, name, fetchedAt, constituents });
  console.log(`${code}: ${constituents.length} constituents @ ${fetchedAt}`);
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${result.length} indices to ${OUTPUT_PATH}`);
