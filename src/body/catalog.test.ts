import { describe, expect, it } from "vitest";
import {
  ASTEROID_BELT,
  DWARF_FACTS,
  DWARF_VISUALS,
  MOON_FACTS,
  MOON_VISUALS,
  PLANET_FACTS,
  PLANET_VISUALS,
  SUN,
  SUN_FACTS,
  SUN_NAME,
  factsFor,
  type BodyFacts,
  type BodyVisual
} from "./catalog";
import {
  DWARF_ELEMENTS,
  DWARF_NAMES,
  MOON_ELEMENTS,
  MOON_NAMES,
  PLANET_NAMES,
  type PlanetName
} from "../orbit/elements";
import { orbitalPeriodDays } from "../orbit/kepler";

// Published equatorial radii [km] from the JPL Planetary Fact Sheets
// (https://nssdc.gsfc.nasa.gov/planetary/factsheet/) — an independent source
// from the catalog's own values.
const PUBLISHED_RADII_KM: Record<PlanetName | "Sun", number> = {
  Mercury: 2439.7,
  Venus: 6051.8,
  Earth: 6371.0,
  Mars: 3389.5,
  Jupiter: 69911.0,
  Saturn: 58232.0,
  Uranus: 25362.0,
  Neptune: 24622.0,
  Sun: 696340.0
};

describe("planet catalog", () => {
  it("covers exactly the eight planets in the orbit module", () => {
    expect(Object.keys(PLANET_VISUALS).sort()).toEqual([...PLANET_NAMES].sort());
  });

  it("gives every planet a renderable color", () => {
    for (const visual of Object.values(PLANET_VISUALS)) {
      expect(Number.isInteger(visual.color)).toBe(true);
      expect(visual.color).toBeGreaterThanOrEqual(0);
      expect(visual.color).toBeLessThanOrEqual(0xffffff);
    }
  });

  for (const [name, published] of Object.entries(PUBLISHED_RADII_KM) as [PlanetName | "Sun", number][]) {
    it(`records ${name}'s radius within 0.5% of the published value`, () => {
      const radiusKm = name === "Sun" ? SUN.radiusKm : PLANET_VISUALS[name].radiusKm;
      expect(Math.abs(radiusKm - published) / published).toBeLessThanOrEqual(0.005);
    });
  }
});

// ---- Full body catalog (ticket #7) ---------------------------------------
//
// Independent published oracles, from the NSSDC fact sheets, JPL planetary
// satellite mean-elements table (https://ssd.jpl.nasa.gov/sats/elem/) and
// JPL Small-Body Database — the same real sources the catalog claims to
// carry. Tolerances absorb source rounding, not sloppy data.

/** The 27 bodies the spec promises: Sun + 8 planets + 13 moons + 5 dwarfs. */
const ALL_BODY_NAMES = [SUN_NAME, ...PLANET_NAMES, ...MOON_NAMES, ...DWARF_NAMES];

/** Published sidereal orbital periods [days] for the 13 moons (JPL sat_elem). */
const PUBLISHED_MOON_PERIODS_DAYS: Record<(typeof MOON_NAMES)[number], number> = {
  Moon: 27.321661,
  Phobos: 0.31891,
  Deimos: 1.26244,
  Io: 1.769138,
  Europa: 3.551181,
  Ganymede: 7.154553,
  Callisto: 16.689018,
  Titan: 15.945421,
  Enceladus: 1.370218,
  Mimas: 0.942422,
  Miranda: 1.413479,
  Triton: 5.876854,
  Charon: 6.3872304
};

/** Published sidereal orbital periods [days] for the 5 dwarf planets. */
const PUBLISHED_DWARF_PERIODS_DAYS: Record<(typeof DWARF_NAMES)[number], number> = {
  Pluto: 90560,
  Ceres: 1681.63,
  Eris: 203600,
  Makemake: 111526,
  Haumea: 103410
};

/** Published mean diameters [km] for the 13 moons (JPL sat_phys_par). */
const PUBLISHED_MOON_DIAMETERS_KM: Record<(typeof MOON_NAMES)[number], number> = {
  Moon: 3474.8,
  Phobos: 22.16,
  Deimos: 12.4,
  Io: 3643.0,
  Europa: 3121.6,
  Ganymede: 5262.4,
  Callisto: 4820.6,
  Titan: 5149.5,
  Enceladus: 504.2,
  Mimas: 396.4,
  Miranda: 471.6,
  Triton: 2705.2,
  Charon: 1212.0
};

/** Published mean diameters [km] for the 5 dwarf planets. */
const PUBLISHED_DWARF_DIAMETERS_KM: Record<(typeof DWARF_NAMES)[number], number> = {
  Pluto: 2376.6,
  Ceres: 939.4,
  Eris: 2326.0,
  Makemake: 1430.0,
  Haumea: 1650.0
};

/** Published mean distances from the Sun [AU] for the 5 dwarf planets. */
const PUBLISHED_DWARF_DISTANCES_AU: Record<(typeof DWARF_NAMES)[number], number> = {
  Pluto: 39.482,
  Ceres: 2.767,
  Eris: 67.668,
  Makemake: 45.4,
  Haumea: 43.13
};

/** Published mean distances from the Sun [AU] for the 8 planets. */
const PUBLISHED_PLANET_DISTANCES_AU: Record<PlanetName, number> = {
  Mercury: 0.387,
  Venus: 0.723,
  Earth: 1.0,
  Mars: 1.524,
  Jupiter: 5.203,
  Saturn: 9.537,
  Uranus: 19.191,
  Neptune: 30.07
};

/** Published moon counts for the 8 planets (NSSDC; Saturn 274 and Uranus 29
 *  are the 2025 IAU-confirmed totals). */
const PUBLISHED_PLANET_MOON_COUNTS: Record<PlanetName, number> = {
  Mercury: 0,
  Venus: 0,
  Earth: 1,
  Mars: 2,
  Jupiter: 95,
  Saturn: 274,
  Uranus: 29,
  Neptune: 16
};

describe("full body catalog", () => {
  it("contains exactly the 27 promised bodies", () => {
    expect(ALL_BODY_NAMES).toHaveLength(27);
    expect(new Set(ALL_BODY_NAMES).size).toBe(27); // no duplicates
  });

  it("has facts and visuals for every body", () => {
    expect(SUN_FACTS).toBeDefined();
    expect(SUN).toBeDefined();
    expect(Object.keys(PLANET_FACTS).sort()).toEqual([...PLANET_NAMES].sort());
    expect(Object.keys(MOON_FACTS).sort()).toEqual([...MOON_NAMES].sort());
    expect(Object.keys(DWARF_FACTS).sort()).toEqual([...DWARF_NAMES].sort());
    expect(Object.keys(MOON_VISUALS).sort()).toEqual([...MOON_NAMES].sort());
    expect(Object.keys(DWARF_VISUALS).sort()).toEqual([...DWARF_NAMES].sort());
  });

  it("resolves facts for every body through the unified lookup", () => {
    for (const name of ALL_BODY_NAMES) {
      expect(factsFor(name)).toBeDefined();
    }
    expect(factsFor("Not a body")).toBeNull();
  });

  it("gives every moon and dwarf planet orbital elements", () => {
    expect(Object.keys(MOON_ELEMENTS).sort()).toEqual([...MOON_NAMES].sort());
    expect(Object.keys(DWARF_ELEMENTS).sort()).toEqual([...DWARF_NAMES].sort());
  });

  it("makes every moon orbit a real primary", () => {
    const primaries = new Set([...PLANET_NAMES, ...DWARF_NAMES]);
    for (const moon of MOON_NAMES) {
      expect(primaries.has(MOON_ELEMENTS[moon].primary)).toBe(true);
    }
    // Charon orbits the dwarf planet Pluto, not a planet.
    expect(MOON_ELEMENTS.Charon.primary).toBe("Pluto");
  });
});

describe("schema test: no missing or invalid entries", () => {
  // One lookup per body kind instead of a per-kind if-cascade.
  const ALL_FACTS: Record<string, BodyFacts> = {
    [SUN_NAME]: SUN_FACTS,
    ...PLANET_FACTS,
    ...MOON_FACTS,
    ...DWARF_FACTS
  };
  const ALL_VISUALS: Record<string, BodyVisual> = {
    [SUN_NAME]: SUN,
    ...PLANET_VISUALS,
    ...MOON_VISUALS,
    ...DWARF_VISUALS
  };

  for (const name of ALL_BODY_NAMES) {
    it(`has complete, valid facts and visuals for ${name}`, () => {
      const facts = ALL_FACTS[name];
      expect(facts.diameterKm).toBeGreaterThan(0);
      expect(Number.isFinite(facts.diameterKm)).toBe(true);
      expect(facts.distanceFromSunAu).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(facts.distanceFromSunAu)).toBe(true);
      expect(facts.dayLengthHours).toBeGreaterThan(0);
      expect(Number.isFinite(facts.dayLengthHours)).toBe(true);
      // The Sun is the frame origin and has no orbit; every other body does.
      if (name === SUN_NAME) {
        expect(facts.orbitalPeriodDays).toBe(0);
      } else {
        expect(facts.orbitalPeriodDays).toBeGreaterThan(0);
      }
      expect(Number.isFinite(facts.orbitalPeriodDays)).toBe(true);
      expect(facts.temperatureK).toBeGreaterThan(0);
      expect(Number.isFinite(facts.temperatureK)).toBe(true);
      expect(facts.moonCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(facts.moonCount)).toBe(true);
      expect(typeof facts.funFact).toBe("string");
      expect(facts.funFact.length).toBeGreaterThan(20);

      const visual = ALL_VISUALS[name];
      expect(visual.radiusKm).toBeGreaterThan(0);
      expect(Number.isInteger(visual.color)).toBe(true);
      expect(visual.color).toBeGreaterThanOrEqual(0);
      expect(visual.color).toBeLessThanOrEqual(0xffffff);
    });
  }

  it("has valid elements for every moon and dwarf planet", () => {
    for (const moon of MOON_NAMES) {
      const e = MOON_ELEMENTS[moon].elements;
      expect(e.a0).toBeGreaterThan(0);
      expect(e.e0).toBeGreaterThanOrEqual(0);
      expect(e.e0).toBeLessThan(1);
      expect(Number.isFinite(e.I0)).toBe(true);
      expect(Number.isFinite(e.L0)).toBe(true);
      expect(Number.isFinite(e.Ldot)).toBe(true);
      expect(e.Ldot).toBeGreaterThan(0);
      expect(Number.isFinite(e.peri0)).toBe(true);
      expect(Number.isFinite(e.node0)).toBe(true);
    }
    for (const dwarf of DWARF_NAMES) {
      const e = DWARF_ELEMENTS[dwarf];
      expect(e.a0).toBeGreaterThan(0);
      expect(e.e0).toBeGreaterThanOrEqual(0);
      expect(e.e0).toBeLessThan(1);
      expect(Number.isFinite(e.I0)).toBe(true);
      expect(Number.isFinite(e.L0)).toBe(true);
      expect(Number.isFinite(e.Ldot)).toBe(true);
      expect(Number.isFinite(e.peri0)).toBe(true);
      expect(Number.isFinite(e.node0)).toBe(true);
    }
  });

  it("has valid asteroid-belt parameters", () => {
    expect(ASTEROID_BELT.innerRadiusAu).toBeGreaterThan(0);
    expect(ASTEROID_BELT.outerRadiusAu).toBeGreaterThan(ASTEROID_BELT.innerRadiusAu);
    expect(ASTEROID_BELT.halfThicknessAu).toBeGreaterThan(0);
    expect(ASTEROID_BELT.particleCount).toBeGreaterThan(0);
    expect(Number.isInteger(ASTEROID_BELT.particleCount)).toBe(true);
    // The main belt sits between Mars (~1.52 AU) and Jupiter (~5.2 AU).
    expect(ASTEROID_BELT.innerRadiusAu).toBeGreaterThan(1.52);
    expect(ASTEROID_BELT.outerRadiusAu).toBeLessThan(5.2);
  });
});

describe("sample values match published values within tolerance", () => {
  // Ticket #7 acceptance: Titan's period, Pluto's distance, Europa's diameter.
  it("records Titan's period within 0.5% of the published 15.945 d", () => {
    expect(Math.abs(MOON_FACTS.Titan.orbitalPeriodDays - 15.945421) / 15.945421).toBeLessThanOrEqual(0.005);
  });

  it("records Pluto's distance within 0.5% of the published 39.48 AU", () => {
    expect(Math.abs(DWARF_FACTS.Pluto.distanceFromSunAu - 39.482) / 39.482).toBeLessThanOrEqual(0.005);
    expect(Math.abs(DWARF_ELEMENTS.Pluto.a0 - 39.48211675) / 39.48211675).toBeLessThanOrEqual(0.005);
  });

  it("records Europa's diameter within 0.5% of the published 3121.6 km", () => {
    expect(Math.abs(MOON_FACTS.Europa.diameterKm - 3121.6) / 3121.6).toBeLessThanOrEqual(0.005);
    expect(Math.abs(MOON_VISUALS.Europa.radiusKm * 2 - 3121.6) / 3121.6).toBeLessThanOrEqual(0.005);
  });
});

describe("data integrity: every entry matches published values", () => {
  for (const [moon, published] of Object.entries(PUBLISHED_MOON_PERIODS_DAYS) as [
    (typeof MOON_NAMES)[number],
    number
  ][]) {
    it(`gives ${moon} its published orbital period`, () => {
      const facts = MOON_FACTS[moon];
      const fromElements = 360 * 36525 / MOON_ELEMENTS[moon].elements.Ldot;
      expect(Math.abs(facts.orbitalPeriodDays - published) / published).toBeLessThanOrEqual(0.005);
      expect(Math.abs(fromElements - published) / published).toBeLessThanOrEqual(0.005);
    });
  }

  for (const [dwarf, published] of Object.entries(PUBLISHED_DWARF_PERIODS_DAYS) as [
    (typeof DWARF_NAMES)[number],
    number
  ][]) {
    it(`gives ${dwarf} its published orbital period`, () => {
      const facts = DWARF_FACTS[dwarf];
      const fromKepler = orbitalPeriodDays(DWARF_ELEMENTS[dwarf].a0);
      expect(Math.abs(facts.orbitalPeriodDays - published) / published).toBeLessThanOrEqual(0.01);
      expect(Math.abs(fromKepler - published) / published).toBeLessThanOrEqual(0.01);
    });
  }

  for (const [moon, published] of Object.entries(PUBLISHED_MOON_DIAMETERS_KM) as [
    (typeof MOON_NAMES)[number],
    number
  ][]) {
    it(`records ${moon}'s diameter within 0.5% of the published value`, () => {
      expect(Math.abs(MOON_FACTS[moon].diameterKm - published) / published).toBeLessThanOrEqual(0.005);
    });
  }

  for (const [dwarf, published] of Object.entries(PUBLISHED_DWARF_DIAMETERS_KM) as [
    (typeof DWARF_NAMES)[number],
    number
  ][]) {
    it(`records ${dwarf}'s diameter within 0.5% of the published value`, () => {
      expect(Math.abs(DWARF_FACTS[dwarf].diameterKm - published) / published).toBeLessThanOrEqual(0.005);
    });
  }

  for (const [dwarf, published] of Object.entries(PUBLISHED_DWARF_DISTANCES_AU) as [
    (typeof DWARF_NAMES)[number],
    number
  ][]) {
    it(`records ${dwarf}'s distance within 0.5% of the published value`, () => {
      expect(Math.abs(DWARF_FACTS[dwarf].distanceFromSunAu - published) / published).toBeLessThanOrEqual(0.005);
    });
  }

  for (const [planet, published] of Object.entries(PUBLISHED_PLANET_DISTANCES_AU) as [PlanetName, number][]) {
    it(`records ${planet}'s distance within 0.5% of the published value`, () => {
      expect(Math.abs(PLANET_FACTS[planet].distanceFromSunAu - published) / published).toBeLessThanOrEqual(0.005);
    });
  }

  for (const moon of MOON_NAMES) {
    it(`records ${moon}'s distance from the Sun as its primary's mean distance`, () => {
      const primary = MOON_ELEMENTS[moon].primary;
      const primaryDistance =
        primary === "Pluto"
          ? DWARF_FACTS.Pluto.distanceFromSunAu
          : PLANET_FACTS[primary as PlanetName].distanceFromSunAu;
      // A moon's heliocentric distance tracks its primary's; the catalog
      // stores the primary's mean distance as the fact-card value.
      expect(Math.abs(MOON_FACTS[moon].distanceFromSunAu - primaryDistance) / primaryDistance).toBeLessThanOrEqual(
        0.005
      );
    });
  }

  for (const [planet, published] of Object.entries(PUBLISHED_PLANET_MOON_COUNTS) as [PlanetName, number][]) {
    it(`records ${planet}'s moon count as published`, () => {
      expect(PLANET_FACTS[planet].moonCount).toBe(published);
    });
  }
});
