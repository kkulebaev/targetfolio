import type { Instrument, Position, TargetWeight } from "./types";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateInstrument(input: unknown): ValidationResult<Instrument> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "instrument must be an object" };
  }
  const o = input as Record<string, unknown>;
  if (typeof o.ticker !== "string" || o.ticker.trim().length === 0) {
    return { ok: false, error: "ticker required" };
  }
  if (typeof o.name !== "string") {
    return { ok: false, error: "name required" };
  }
  if (typeof o.lotSize !== "number" || !Number.isInteger(o.lotSize) || o.lotSize < 1) {
    return { ok: false, error: "lotSize must be integer >= 1" };
  }
  if (typeof o.price !== "number" || !Number.isFinite(o.price) || o.price <= 0) {
    return { ok: false, error: "price must be a positive number" };
  }
  return {
    ok: true,
    value: { ticker: o.ticker, name: o.name, lotSize: o.lotSize, price: o.price },
  };
}

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

export type PersistedState = {
  _schemaVersion: 1;
  targetWeights: TargetWeight[];
  instruments: Instrument[];
};

export function parsePersistedState(raw: unknown): PersistedState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o._schemaVersion !== 1) return null;
  if (!Array.isArray(o.targetWeights) || !Array.isArray(o.instruments)) return null;

  const targetWeights: TargetWeight[] = [];
  for (const item of o.targetWeights) {
    const result = validateTargetWeight(item);
    if (!result.ok) return null;
    targetWeights.push(result.value);
  }

  const instruments: Instrument[] = [];
  for (const item of o.instruments) {
    const result = validateInstrument(item);
    if (!result.ok) return null;
    instruments.push(result.value);
  }

  return { _schemaVersion: 1, targetWeights, instruments };
}
