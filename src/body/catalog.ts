/**
 * Body catalog: the complete dataset behind the content (ticket #7) — the
 * Sun, eight planets, thirteen moons, five dwarf planets, and the asteroid
 * belt.
 *
 * Orbital elements live in `src/orbit/elements.ts`; this module holds the
 * fact-card fields (diameter, distance from the Sun, day length, orbital
 * period, temperature, moon count, fun fact) plus the visual data (radius
 * and stylized color) the scene renders. Fact values are the published
 * JPL/NASA figures (NSSDC Planetary Fact Sheets, JPL planetary satellite
 * tables, JPL Small-Body Database); the data-integrity tests assert every
 * entry is complete and matches published values within tolerance.
 *
 * Bodies are keyed by their canonical name — the same key the orbit module
 * uses (see `src/orbit/elements.ts`). The Sun has no orbit-module key, so it
 * needs its own.
 */

import type { DwarfName, MoonName, PlanetName } from "../orbit/elements";

/** Physical equatorial radius [km], published value. */
export interface BodyVisual {
  radiusKm: number;
  /** Stylized surface color. */
  color: number;
}

/**
 * Fact-card data for a body (spec user story 26/28): real published values
 * plus one curated, fact-checked fun fact. "vs Earth" size is derived from
 * the diameter at render time, not stored.
 */
export interface BodyFacts {
  /** Equatorial/mean diameter [km], published value. */
  diameterKm: number;
  /** Mean distance from the Sun [AU] (for moons: the primary's mean
   *  distance — the moon's own heliocentric distance varies with it). */
  distanceFromSunAu: number;
  /** Rotation period — the length of a day [hours]. */
  dayLengthHours: number;
  /** Sidereal orbital period [days] around the primary (Sun for planets). */
  orbitalPeriodDays: number;
  /** Mean surface/effective temperature [K]. */
  temperatureK: number;
  /** Number of moons. */
  moonCount: number;
  /** One curated fun fact. */
  funFact: string;
}

/** Asteroid-belt parameters (main belt between Mars and Jupiter). */
export interface AsteroidBeltParameters {
  /** Inner edge of the main belt [AU]. */
  innerRadiusAu: number;
  /** Outer edge of the main belt [AU]. */
  outerRadiusAu: number;
  /** Vertical half-thickness of the belt [AU]. */
  halfThicknessAu: number;
  /** Number of particles in the stylized field the scene renders. */
  particleCount: number;
}

/** Display name of the Sun — it has no orbit-module key, so it needs one. */
export const SUN_NAME = "Sun";

export const SUN: BodyVisual = {
  radiusKm: 696340,
  color: 0xffcc66
};

export const SUN_FACTS: BodyFacts = {
  diameterKm: 1392680,
  distanceFromSunAu: 0,
  dayLengthHours: 609.1,
  orbitalPeriodDays: 0,
  temperatureK: 5772,
  moonCount: 0,
  funFact: "The Sun contains 99.86% of all the mass in the solar system."
};

export const PLANET_VISUALS: Record<PlanetName, BodyVisual> = {
  Mercury: { radiusKm: 2439.7, color: 0x9b9b9b },
  Venus: { radiusKm: 6051.8, color: 0xe6c489 },
  Earth: { radiusKm: 6371.0, color: 0x3d6fd6 },
  Mars: { radiusKm: 3389.5, color: 0xc05b35 },
  Jupiter: { radiusKm: 69911.0, color: 0xd8a879 },
  Saturn: { radiusKm: 58232.0, color: 0xe3c78e },
  Uranus: { radiusKm: 25362.0, color: 0x9fd9e0 },
  Neptune: { radiusKm: 24622.0, color: 0x4a6cd4 }
};

export const PLANET_FACTS: Record<PlanetName, BodyFacts> = {
  Mercury: {
    diameterKm: 4879.4,
    distanceFromSunAu: 0.387,
    dayLengthHours: 1407.6,
    orbitalPeriodDays: 87.969,
    temperatureK: 440,
    moonCount: 0,
    funFact: "A year on Mercury is just 88 days, but one day-night cycle lasts 176 Earth days."
  },
  Venus: {
    diameterKm: 12103.6,
    distanceFromSunAu: 0.723,
    dayLengthHours: 5832.5,
    orbitalPeriodDays: 224.701,
    temperatureK: 737,
    moonCount: 0,
    funFact: "Venus spins backwards — the Sun rises in the west — and its day is longer than its year."
  },
  Earth: {
    diameterKm: 12742.0,
    distanceFromSunAu: 1.0,
    dayLengthHours: 23.9345,
    orbitalPeriodDays: 365.256,
    temperatureK: 288,
    moonCount: 1,
    funFact: "Earth is the only known world with liquid water on its surface."
  },
  Mars: {
    diameterKm: 6779.0,
    distanceFromSunAu: 1.524,
    dayLengthHours: 24.6229,
    orbitalPeriodDays: 686.98,
    temperatureK: 210,
    moonCount: 2,
    funFact: "Mars is home to Olympus Mons, the tallest volcano in the solar system — nearly three times the height of Everest."
  },
  Jupiter: {
    diameterKm: 139822.0,
    distanceFromSunAu: 5.203,
    dayLengthHours: 9.925,
    orbitalPeriodDays: 4332.589,
    temperatureK: 110,
    moonCount: 95,
    funFact: "Jupiter's Great Red Spot is a storm larger than Earth that has raged for centuries."
  },
  Saturn: {
    diameterKm: 116464.0,
    distanceFromSunAu: 9.537,
    dayLengthHours: 10.656,
    orbitalPeriodDays: 10759.22,
    temperatureK: 81,
    moonCount: 274,
    funFact: "Saturn is so light it would float in water — its density is lower than water's."
  },
  Uranus: {
    diameterKm: 50724.0,
    distanceFromSunAu: 19.191,
    dayLengthHours: 17.24,
    orbitalPeriodDays: 30688.5,
    temperatureK: 58,
    moonCount: 29,
    funFact: "Uranus rolls around the Sun on its side, tilted 98 degrees."
  },
  Neptune: {
    diameterKm: 49244.0,
    distanceFromSunAu: 30.07,
    dayLengthHours: 16.11,
    orbitalPeriodDays: 60182,
    temperatureK: 59,
    moonCount: 16,
    funFact: "Neptune's winds are the fastest in the solar system, topping 2,000 km/h."
  }
};

export const MOON_VISUALS: Record<MoonName, BodyVisual> = {
  Moon: { radiusKm: 1737.4, color: 0xcfcfcf },
  Phobos: { radiusKm: 11.08, color: 0x8a7f72 },
  Deimos: { radiusKm: 6.2, color: 0x9a8f82 },
  Io: { radiusKm: 1821.49, color: 0xd8c25a },
  Europa: { radiusKm: 1560.8, color: 0xc9b8a0 },
  Ganymede: { radiusKm: 2631.2, color: 0x9a8a72 },
  Callisto: { radiusKm: 2410.3, color: 0x6b5f4f },
  Titan: { radiusKm: 2574.76, color: 0xd9a75e },
  Enceladus: { radiusKm: 252.1, color: 0xe8ece8 },
  Mimas: { radiusKm: 198.2, color: 0xc8c8c8 },
  Miranda: { radiusKm: 235.8, color: 0x8f9aa8 },
  Triton: { radiusKm: 1352.6, color: 0xc9d2d8 },
  Charon: { radiusKm: 606.0, color: 0x9a8f80 }
};

export const MOON_FACTS: Record<MoonName, BodyFacts> = {
  Moon: {
    diameterKm: 3474.8,
    distanceFromSunAu: 1.0,
    dayLengthHours: 655.7,
    orbitalPeriodDays: 27.3217,
    temperatureK: 250,
    moonCount: 0,
    funFact: "The Moon is drifting away from Earth by about 3.8 cm every year."
  },
  Phobos: {
    diameterKm: 22.16,
    distanceFromSunAu: 1.524,
    dayLengthHours: 7.65,
    orbitalPeriodDays: 0.31891,
    temperatureK: 233,
    moonCount: 0,
    funFact: "Phobos orbits Mars so closely that it rises and sets twice a day — and is slowly spiraling inward."
  },
  Deimos: {
    diameterKm: 12.4,
    distanceFromSunAu: 1.524,
    dayLengthHours: 30.3,
    orbitalPeriodDays: 1.26244,
    temperatureK: 233,
    moonCount: 0,
    funFact: "Deimos is so small that from Mars it looks more like a bright star than a moon."
  },
  Io: {
    diameterKm: 3643.0,
    distanceFromSunAu: 5.203,
    dayLengthHours: 42.46,
    orbitalPeriodDays: 1.769138,
    temperatureK: 110,
    moonCount: 0,
    funFact: "Io is the most volcanically active world in the solar system."
  },
  Europa: {
    diameterKm: 3121.6,
    distanceFromSunAu: 5.203,
    dayLengthHours: 85.23,
    orbitalPeriodDays: 3.551181,
    temperatureK: 102,
    moonCount: 0,
    funFact: "Europa's icy crust hides a salty ocean with more water than all of Earth's oceans combined."
  },
  Ganymede: {
    diameterKm: 5262.4,
    distanceFromSunAu: 5.203,
    dayLengthHours: 171.71,
    orbitalPeriodDays: 7.154553,
    temperatureK: 110,
    moonCount: 0,
    funFact: "Ganymede is the largest moon in the solar system — bigger than the planet Mercury."
  },
  Callisto: {
    diameterKm: 4820.6,
    distanceFromSunAu: 5.203,
    dayLengthHours: 400.54,
    orbitalPeriodDays: 16.689018,
    temperatureK: 134,
    moonCount: 0,
    funFact: "Callisto has the most heavily cratered surface in the solar system."
  },
  Titan: {
    diameterKm: 5149.5,
    distanceFromSunAu: 9.537,
    dayLengthHours: 382.69,
    orbitalPeriodDays: 15.945,
    temperatureK: 93.7,
    moonCount: 0,
    funFact: "Titan is the only moon with a thick atmosphere — and it rains liquid methane."
  },
  Enceladus: {
    diameterKm: 504.2,
    distanceFromSunAu: 9.537,
    dayLengthHours: 32.89,
    orbitalPeriodDays: 1.370218,
    temperatureK: 75,
    moonCount: 0,
    funFact: "Enceladus shoots geysers of water ice from its south pole into space."
  },
  Mimas: {
    diameterKm: 396.4,
    distanceFromSunAu: 9.537,
    dayLengthHours: 22.62,
    orbitalPeriodDays: 0.942422,
    temperatureK: 64,
    moonCount: 0,
    funFact: "Mimas's giant Herschel crater makes it look like the Death Star."
  },
  Miranda: {
    diameterKm: 471.6,
    distanceFromSunAu: 19.191,
    dayLengthHours: 33.92,
    orbitalPeriodDays: 1.413479,
    temperatureK: 60,
    moonCount: 0,
    funFact: "Miranda's Verona Rupes is a cliff up to 20 km tall — among the tallest in the solar system."
  },
  Triton: {
    diameterKm: 2705.2,
    distanceFromSunAu: 30.07,
    dayLengthHours: 141.04,
    orbitalPeriodDays: 5.876854,
    temperatureK: 38,
    moonCount: 0,
    funFact: "Triton orbits Neptune backwards — the only large moon to do so."
  },
  Charon: {
    diameterKm: 1212.0,
    distanceFromSunAu: 39.482,
    dayLengthHours: 153.29,
    orbitalPeriodDays: 6.3872304,
    temperatureK: 53,
    moonCount: 0,
    funFact: "Charon is so large relative to Pluto that the pair are sometimes called a double dwarf planet."
  }
};

export const DWARF_VISUALS: Record<DwarfName, BodyVisual> = {
  Pluto: { radiusKm: 1188.3, color: 0xc9a87a },
  Ceres: { radiusKm: 469.7, color: 0x8f8a82 },
  Eris: { radiusKm: 1163.0, color: 0xe8e4dc },
  Makemake: { radiusKm: 715.0, color: 0xa86a4a },
  Haumea: { radiusKm: 825.0, color: 0xb8bcc0 }
};

export const DWARF_FACTS: Record<DwarfName, BodyFacts> = {
  Pluto: {
    diameterKm: 2376.6,
    distanceFromSunAu: 39.482,
    dayLengthHours: 153.2935,
    orbitalPeriodDays: 90560,
    temperatureK: 44,
    moonCount: 5,
    funFact: "Pluto's heart-shaped nitrogen glacier, Tombaugh Regio, is larger than Texas."
  },
  Ceres: {
    diameterKm: 939.4,
    distanceFromSunAu: 2.767,
    dayLengthHours: 9.07417,
    orbitalPeriodDays: 1681.63,
    temperatureK: 168,
    moonCount: 0,
    funFact: "Ceres is the largest object in the asteroid belt and the only dwarf planet in the inner solar system."
  },
  Eris: {
    diameterKm: 2326.0,
    distanceFromSunAu: 67.668,
    dayLengthHours: 378.9,
    orbitalPeriodDays: 203600,
    temperatureK: 42,
    moonCount: 1,
    funFact: "Eris is slightly smaller than Pluto but far more massive — its discovery helped demote Pluto."
  },
  Makemake: {
    diameterKm: 1430.0,
    distanceFromSunAu: 45.4,
    dayLengthHours: 22.83,
    orbitalPeriodDays: 111526,
    temperatureK: 36,
    moonCount: 1,
    funFact: "Makemake was discovered around Easter 2005 and is named after the Rapa Nui creator god."
  },
  Haumea: {
    diameterKm: 1650.0,
    distanceFromSunAu: 43.13,
    dayLengthHours: 3.915341,
    orbitalPeriodDays: 103410,
    temperatureK: 40,
    moonCount: 2,
    funFact: "Haumea spins so fast it is stretched into an egg shape — and it even has its own ring."
  }
};

/** Main-belt parameters (JPL/NSSDC): 2.1-3.3 AU, ~0.5 AU half-thickness. */
export const ASTEROID_BELT: AsteroidBeltParameters = {
  innerRadiusAu: 2.2,
  outerRadiusAu: 3.3,
  halfThicknessAu: 0.5,
  particleCount: 6000
};

/**
 * Unified fact lookup for the fact card (ticket #9): any body's canonical
 * name resolves to its `BodyFacts`, across the Sun, planets, moons, and
 * dwarf planets. Returns null for unknown names.
 */
export function factsFor(name: string): BodyFacts | null {
  if (name === SUN_NAME) return SUN_FACTS;
  return (
    PLANET_FACTS[name as PlanetName] ??
    MOON_FACTS[name as MoonName] ??
    DWARF_FACTS[name as DwarfName] ??
    null
  );
}
