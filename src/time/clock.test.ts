import { describe, expect, it } from "vitest";
import { SECONDS_PER_DAY, SimClock, WARP_PRESETS } from "./clock";

describe("warp presets", () => {
  it("maps each preset to the exact sim-seconds per real-second", () => {
    expect(WARP_PRESETS.realTime).toBe(1);
    expect(WARP_PRESETS.hourPerSecond).toBe(3600);
    expect(WARP_PRESETS.dayPerSecond).toBe(86400);
    // Mean calendar month: 365.2425 / 12 days.
    expect(WARP_PRESETS.monthPerSecond).toBe(2629746);
  });
});

describe("SimClock", () => {
  it("advances the sim date by warp × real time", () => {
    const clock = new SimClock({ daysSinceJ2000: 0, warp: WARP_PRESETS.dayPerSecond });
    clock.tick(1);
    expect(clock.simDate).toBeCloseTo(1, 10);
    clock.tick(0.5);
    expect(clock.simDate).toBeCloseTo(1.5, 10);
  });

  it("a day-per-second warp advances exactly one day per second", () => {
    const clock = new SimClock({ daysSinceJ2000: 0, warp: WARP_PRESETS.dayPerSecond });
    clock.tick(1);
    expect(clock.simDate * SECONDS_PER_DAY).toBeCloseTo(86400, 6);
  });

  it("a month-per-second warp advances one mean month per second", () => {
    const clock = new SimClock({ daysSinceJ2000: 0, warp: WARP_PRESETS.monthPerSecond });
    clock.tick(1);
    expect(clock.simDate).toBeCloseTo(365.2425 / 12, 10);
  });

  it("a paused clock does not advance", () => {
    const clock = new SimClock({ daysSinceJ2000: 10, warp: WARP_PRESETS.dayPerSecond });
    clock.setPaused(true);
    clock.tick(60);
    expect(clock.simDate).toBe(10);
  });

  it("resumes advancing after unpausing", () => {
    const clock = new SimClock({ daysSinceJ2000: 0, warp: WARP_PRESETS.dayPerSecond });
    clock.setPaused(true);
    clock.tick(5);
    clock.setPaused(false);
    clock.tick(2);
    expect(clock.simDate).toBeCloseTo(2, 10);
  });

  it("applies warp changes made at runtime", () => {
    const clock = new SimClock({ daysSinceJ2000: 0, warp: WARP_PRESETS.realTime });
    clock.tick(1);
    expect(clock.simDate).toBeCloseTo(1 / SECONDS_PER_DAY, 12);
    clock.setWarp(WARP_PRESETS.hourPerSecond);
    clock.tick(1);
    expect(clock.simDate).toBeCloseTo((1 + 3600) / SECONDS_PER_DAY, 12);
  });

  it("exposes its state read-only", () => {
    const clock = new SimClock({ daysSinceJ2000: 3, warp: WARP_PRESETS.dayPerSecond });
    expect(clock.simDate).toBe(3);
    expect(clock.warp).toBe(WARP_PRESETS.dayPerSecond);
    expect(clock.paused).toBe(false);
  });
});
