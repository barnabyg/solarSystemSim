/**
 * Simulation clock: owns the sim date (days since J2000.0), the time-warp
 * rate, and pause state. Pure state, no rendering or I/O.
 */

export const SECONDS_PER_DAY = 86400;

/** Warp presets: sim-seconds that pass per real second. */
export const WARP_PRESETS = {
  realTime: 1,
  hourPerSecond: 3600,
  dayPerSecond: SECONDS_PER_DAY,
  /** Mean calendar month: 365.2425 / 12 days. */
  monthPerSecond: 2629746
} as const;

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
}
