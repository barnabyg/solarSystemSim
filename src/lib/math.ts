/**
 * Clamp `value` into the inclusive range [min, max].
 * An inverted range (min > max) returns `min` by construction.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(max, Math.max(min, value));
}
