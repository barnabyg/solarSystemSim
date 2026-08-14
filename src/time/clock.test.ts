import { describe, expect, it } from "vitest";
import {
  adjustWarp,
  dateToDaysSinceJ2000,
  formatWarp,
  SECONDS_PER_DAY,
  SimClock,
  simDateToIso,
  WARP_PRESETS
} from "./clock";

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

  it("steps the sim date forward by whole days", () => {
    const clock = new SimClock({ daysSinceJ2000: 0 });
    clock.step(1);
    expect(clock.simDate).toBe(1);
    clock.step(2);
    expect(clock.simDate).toBe(3);
  });

  it("steps backward with a negative amount", () => {
    const clock = new SimClock({ daysSinceJ2000: 10 });
    clock.step(-1);
    expect(clock.simDate).toBe(9);
  });

  it("steps even while paused", () => {
    const clock = new SimClock({ daysSinceJ2000: 0, warp: WARP_PRESETS.dayPerSecond });
    clock.setPaused(true);
    clock.tick(60);
    expect(clock.simDate).toBe(0);
    clock.step(1);
    expect(clock.simDate).toBe(1);
  });

  it("stepping leaves the warp rate and pause state untouched", () => {
    const clock = new SimClock({ daysSinceJ2000: 0, warp: WARP_PRESETS.hourPerSecond });
    clock.setPaused(true);
    clock.step(3);
    expect(clock.simDate).toBe(3);
    expect(clock.warp).toBe(WARP_PRESETS.hourPerSecond);
    expect(clock.paused).toBe(true);
  });
});

describe("adjustWarp", () => {
  it("doubles the warp rate when stepping up", () => {
    expect(adjustWarp(1, 1)).toBe(2);
    expect(adjustWarp(43200, 1)).toBe(86400);
  });

  it("halves the warp rate when stepping down", () => {
    expect(adjustWarp(2, -1)).toBe(1);
    expect(adjustWarp(86400, -1)).toBe(43200);
  });

  it("clamps at the real-time floor", () => {
    expect(adjustWarp(1, -1)).toBe(1);
  });

  it("clamps at the month-per-second ceiling", () => {
    expect(adjustWarp(WARP_PRESETS.monthPerSecond, 1)).toBe(WARP_PRESETS.monthPerSecond);
  });
});

describe("formatWarp", () => {
  it("labels the presets with their friendly names", () => {
    expect(formatWarp(1)).toBe("1×");
    expect(formatWarp(WARP_PRESETS.hourPerSecond)).toBe("1 h/s");
    expect(formatWarp(WARP_PRESETS.dayPerSecond)).toBe("1 d/s");
    expect(formatWarp(WARP_PRESETS.monthPerSecond)).toBe("1 mo/s");
  });

  it("scales derived rates to the largest whole unit", () => {
    expect(formatWarp(2)).toBe("2×");
    expect(formatWarp(1800)).toBe("30 min/s");
    expect(formatWarp(172800)).toBe("2 d/s");
    expect(formatWarp(26297460)).toBe("10 mo/s");
  });

  it("shows one decimal for fractional units", () => {
    expect(formatWarp(90)).toBe("1.5 min/s");
    expect(formatWarp(129600)).toBe("1.5 d/s");
  });
});

describe("dateToDaysSinceJ2000", () => {
  it("maps the J2000.0 epoch instant to 0", () => {
    expect(dateToDaysSinceJ2000(new Date(Date.UTC(2000, 0, 1, 12)))).toBe(0);
  });

  it("counts whole days from the epoch", () => {
    expect(dateToDaysSinceJ2000(new Date(Date.UTC(2000, 0, 2, 12)))).toBe(1);
    expect(dateToDaysSinceJ2000(new Date(Date.UTC(2000, 0, 3, 12)))).toBe(2);
  });

  it("counts before the epoch as negative", () => {
    expect(dateToDaysSinceJ2000(new Date(Date.UTC(1999, 11, 31, 12)))).toBe(-1);
  });

  it("agrees with the Horizons oracle date used by the orbit tests", () => {
    // 2026-08-13 00:00 UT is 9720.5 days past J2000.0 — the same epoch the
    // kepler.test.ts Horizons oracle is measured at, so this cross-checks the
    // two modules against the same independent source.
    expect(dateToDaysSinceJ2000(new Date(Date.UTC(2026, 7, 13)))).toBeCloseTo(9720.5, 10);
  });
});

describe("simDateToIso", () => {
  it("renders the J2000.0 epoch as its calendar date", () => {
    expect(simDateToIso(0)).toBe("2000-01-01T12:00:00.000Z");
  });

  it("renders the Horizons oracle date", () => {
    expect(simDateToIso(9720.5)).toBe("2026-08-13T00:00:00.000Z");
  });

  it("wraps whole days", () => {
    expect(simDateToIso(1.5)).toBe("2000-01-03T00:00:00.000Z");
  });
});
