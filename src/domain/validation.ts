import type { Position, TargetWeight } from "./types";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validatePosition(input: unknown): ValidationResult<Position> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "position must be an object" };
  }
  const o = input as Record<string, unknown>;
  if (typeof o.ticker !== "string" || o.ticker.trim().length === 0) {
    return { ok: false, error: "ticker required" };
  }
  if (typeof o.quantity !== "number" || !Number.isInteger(o.quantity) || o.quantity < 0) {
    return { ok: false, error: "quantity must be a non-negative integer" };
  }
  return { ok: true, value: { ticker: o.ticker, quantity: o.quantity } };
}

export function validateTargetWeight(input: unknown): ValidationResult<TargetWeight> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "target weight must be an object" };
  }
  const o = input as Record<string, unknown>;
  if (typeof o.ticker !== "string" || o.ticker.trim().length === 0) {
    return { ok: false, error: "ticker required" };
  }
  if (
    typeof o.weightPercent !== "number" ||
    !Number.isFinite(o.weightPercent) ||
    o.weightPercent < 0 ||
    o.weightPercent > 100
  ) {
    return { ok: false, error: "weightPercent must be a number in [0, 100]" };
  }
  return { ok: true, value: { ticker: o.ticker, weightPercent: o.weightPercent } };
}

export function weightsTotal(weights: readonly TargetWeight[]): number {
  let total = 0;
  for (const w of weights) total += w.weightPercent;
  return total;
}

export function isWeightsValid(weights: readonly TargetWeight[]): boolean {
  if (weights.length === 0) return false;
  return Math.abs(weightsTotal(weights) - 100) < 0.001;
}
