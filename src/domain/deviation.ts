export type DeviationLevel = "ok" | "warn" | "high";

// Thresholds are in percentage points: overweight and underweight are equally off-target,
// so only the magnitude decides the level.
export const DEVIATION_OK_MAX = 1;
export const DEVIATION_WARN_MAX = 3;

export function deviationLevel(deviation: number): DeviationLevel {
  const magnitude = Math.abs(deviation);
  if (magnitude <= DEVIATION_OK_MAX) return "ok";
  if (magnitude <= DEVIATION_WARN_MAX) return "warn";
  return "high";
}
