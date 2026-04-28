import type { TargetWeight } from "@/domain/types";

export function encodeCustomWeights(weights: TargetWeight[]): string {
  const text = weights.map((w) => `${w.ticker}:${w.weightPercent}`).join(",");
  return btoa(text);
}

export function decodeCustomWeights(encoded: string): TargetWeight[] | null {
  let text: string;
  try {
    text = atob(encoded);
  } catch {
    return null;
  }
  if (text.length === 0) return [];
  const parts = text.split(",");
  const result: TargetWeight[] = [];
  for (const part of parts) {
    const colon = part.indexOf(":");
    if (colon <= 0) return null;
    const ticker = part.slice(0, colon);
    const weight = Number(part.slice(colon + 1));
    if (!Number.isFinite(weight)) return null;
    result.push({ ticker, weightPercent: weight });
  }
  return result;
}
