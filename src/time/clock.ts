/**
 * Simulation clock: owns the sim date (days since J2000.0), the time-warp
 * rate, and pause state. Pure state, no rendering or I/O.
 */

export const SECONDS_PER_DAY = 86400;

/** The J2000.0 epoch instant (JD 2451545.0 TT): 2000-01-01T12:00:00Z. */
export const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12);

/** Warp presets: sim-seconds that pass per real second. */
export const WARP_PRESETS = {
  realTime: 1,
  hourPerSecond: 3600,
  dayPerSecond: SECONDS_PER_DAY,
  /** Mean calendar month: 365.2425 / 12 days. */
  monthPerSecond: 2629746
} as const;

/** The warp range the time controls offer: real time up to one month/s. */
export const WARP_MIN = 1;
export const WARP_MAX = WARP_PRESETS.monthPerSecond;

/** Clamp a warp rate into the time-controls range. */
export function clampWarp(rate: number): number {
  return Math.min(WARP_MAX, Math.max(WARP_MIN, rate));
}

/**
 * Keyboard +/- warp adjustment: double (direction 1) or halve (direction -1)
 * the current rate, clamped into the time-controls range.
 */
export function adjustWarp(rate: number, direction: 1 | -1): number {
  return clampWarp(direction > 0 ? rate * 2 : rate / 2);
}

/**
 * Human-readable label for a warp rate, e.g. the readout next to the slider:
 * presets get their friendly names (1×, 1 h/s, 1 d/s, 1 mo/s); derived rates
 * scale to the largest unit worth at least one of.
 */
export function formatWarp(rate: number): string {
  if (rate === 1) return "1×";
  if (rate >= WARP_PRESETS.monthPerSecond) {
    return `${formatWarpValue(rate / WARP_PRESETS.monthPerSecond)} mo/s`;
  }
  if (rate >= WARP_PRESETS.dayPerSecond) {
    return `${formatWarpValue(rate / WARP_PRESETS.dayPerSecond)} d/s`;
  }
  if (rate >= WARP_PRESETS.hourPerSecond) {
    return `${formatWarpValue(rate / WARP_PRESETS.hourPerSecond)} h/s`;
  }
  if (rate >= 60) {
    return `${formatWarpValue(rate / 60)} min/s`;
  }
  return `${formatWarpValue(rate)}×`;
}

function formatWarpValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (value >= 10) return value.toFixed(0);
  return value.toFixed(1);
}

export interface SimClockOptions {
  /** Sim date at construction, days past J2000.0. Defaults to J2000.0. */
  daysSinceJ2000?: number;
  /** Warp rate (sim-seconds per real-second). Defaults to one day/s. */
  warp?: number;
}

export class SimClock {
  private currentDays: number;
  private warpRate: number;
  private isPaused = false;

  constructor(options: SimClockOptions = {}) {
    this.currentDays = options.daysSinceJ2000 ?? 0;
    this.warpRate = options.warp ?? WARP_PRESETS.dayPerSecond;
  }

  /** Current sim date, days past J2000.0. */
  get simDate(): number {
    return this.currentDays;
  }

  /** Sim-seconds per real-second. */
  get warp(): number {
    return this.warpRate;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  setWarp(rate: number): void {
    this.warpRate = rate;
  }

  /** Advance the sim by `realSeconds` of wall-clock time. */
  tick(realSeconds: number): void {
    if (this.isPaused) return;
    this.currentDays += (realSeconds * this.warpRate) / SECONDS_PER_DAY;
  }

  /**
   * Step the sim date by a fixed number of days, independent of pause and
   * warp — the arrow-key "step time" control (one day per press).
   */
  step(days: number): void {
    this.currentDays += days;
  }
}

/**
 * Days past J2000.0 for a real `date` (TT ≈ UTC for the sim's purposes).
 */
export function dateToDaysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_EPOCH_MS) / (SECONDS_PER_DAY * 1000);
}

/**
 * ISO-8601 timestamp of a sim date (days past J2000.0), e.g. the calendar
 * date readout and the e2e "sim date = today" seam.
 */
export function simDateToIso(days: number): string {
  return new Date(J2000_EPOCH_MS + days * SECONDS_PER_DAY * 1000).toISOString();
}
