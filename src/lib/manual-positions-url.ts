import type { Position } from "@/domain/types";

export function encodeManualPositions(positions: readonly Position[]): string {
  const text = positions.map((p) => `${p.ticker}:${p.quantity}`).join(",");
  return btoa(text);
}

export function decodeManualPositions(encoded: string): Position[] | null {
  let text: string;
  try {
    text = atob(encoded);
  } catch {
    return null;
  }
  if (text.length === 0) return [];
  const parts = text.split(",");
  const result: Position[] = [];
  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon <= 0) return null;
    const ticker = part.slice(0, colon);
    const quantity = Number(part.slice(colon + 1));
    if (!Number.isInteger(quantity) || quantity < 0) return null;
    result.push({ ticker, quantity });
  }
  return result;
}
