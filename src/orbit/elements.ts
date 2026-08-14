import type { OrbitalElements } from "./kepler";

// Keplerian elements and rates for the eight planets, from the JPL Solar
// System Dynamics "Approximate Positions of the Planets" tables
// (https://ssd.jpl.nasa.gov/planets/approx_pos.html), Table 1: elements and
// rates with respect to the mean ecliptic and equinox of J2000, valid for
// 1800 AD - 2050 AD (the interval containing the sim's epochs). Units:
// a [AU, AU/century], e [-], and I, L, longitude-of-perihelion,
// longitude-of-node [deg, deg/century]. Epoch: J2000.0 (JD 2451545.0, TT).
//
// Table 1 was chosen over Table 2a (3000 BC - 3000 AD) because it agrees
// with the full JPL ephemeris far better inside our epoch range (measured
// against Horizons: inner planets ~1e-5..3e-4 AU, outer ~3e-3..3e-2 AU);
// Table 2a's long-interval fit carries larger residuals here.
//
// Earth is the Earth/Moon barycenter row ("EM Bary"), the standard JPL
// approximation; the Moon will orbit Earth as a separate body.

export const PLANET_NAMES = [
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune"
] as const;

export type PlanetName = (typeof PLANET_NAMES)[number];

// ---- Moons ----
//
// Mean orbital elements of the 13 major moons, from the JPL Planetary
// Satellite Mean Elements table (https://ssd.jpl.nasa.gov/sats/elem/),
// epoch 2000-01-01.5 TDB (Charon: 2020-01-01.5). Columns a, e, ω, M, i,
// node are the published mean elements; P (sidereal period) is published
// alongside. Elements are PLANETOCENTRIC — the moon orbits its primary, not
// the Sun — so `primary` names the body the moon orbits and the elements
// describe the orbit around it (positionAt yields a position relative to the
// primary). The angles are referred to the local Laplace plane / planet
// equator, not the ecliptic; the scene composes the primary's position.
// Rates of a, e, i, peri and node are not published for satellites, so only
// the mean-longitude rate (360 deg per period) is non-zero.
//
// The epoch angles are given in the JPL table as node (Ω), peri (argument of
// perihelion ω) and M; these are combined here into the same mean-longitude
// form the planets use: L0 = Ω + ω + M, peri0 = Ω + ω (longitude of
// perihelion), node0 = Ω. Ldot = 360 × 36525 / P (deg per century).
// Apsidal and nodal precession periods Papsis/Pnode (years) give the
// longitude rates peridot = 360/Papsis × 100 and nodedot = 360/Pnode × 100
// (deg per century); zero where the table reports no precession.

export const MOON_NAMES = [
  "Moon",
  "Phobos",
  "Deimos",
  "Io",
  "Europa",
  "Ganymede",
  "Callisto",
  "Titan",
  "Enceladus",
  "Mimas",
  "Miranda",
  "Triton",
  "Charon"
] as const;

export type MoonName = (typeof MOON_NAMES)[number];

export interface MoonOrbit {
  /** The body this moon orbits (a planet, or Pluto for Charon). */
  primary: PlanetName | DwarfName;
  /** Planetocentric orbital elements. */
  elements: OrbitalElements;
}

export const MOON_ELEMENTS: Record<MoonName, MoonOrbit> = {
  Moon: {
    primary: "Earth",
    elements: { a0: 0.0025695553, adot: 0, e0: 0.0554, edot: 0, I0: 5.16, Idot: 0, L0: 218.5, Ldot: 481265.807, peri0: 83.23, peridot: 6003.0015, node0: 125.08, nodedot: 1935.4839 }
  },
  Phobos: {
    primary: "Mars",
    elements: { a0: 0.0000628351, adot: 0, e0: 0.015, edot: 0, I0: 1.1, Idot: 0, L0: 215.1, Ldot: 41231068.326, peri0: 25.5, peridot: 31802.1201, node0: 169.2, nodedot: 15915.1194 }
  },
  Deimos: {
    primary: "Mars",
    elements: { a0: 0.0001570878, adot: 0, e0: 0, edot: 0, I0: 1.8, Idot: 0, L0: 259.4, Ldot: 10415544.501, peri0: 54.4, peridot: 0, node0: 54.4, nodedot: 660.1023 }
  },
  Io: {
    primary: "Jupiter",
    elements: { a0: 0.0028195588, adot: 0, e0: 0.004, edot: 0, I0: 0, Idot: 0, L0: 20.0, Ldot: 7432433.196, peri0: 49.1, peridot: 27006.7517, node0: 0, nodedot: 0 }
  },
  Europa: {
    primary: "Jupiter",
    elements: { a0: 0.0044860264, adot: 0, e0: 0.009, edot: 0, I0: 0.5, Idot: 0, L0: 214.4, Ldot: 3702711.858, peri0: 229.0, peridot: 25824.9641, node0: 184.0, nodedot: 1191.974 }
  },
  Ganymede: {
    primary: "Jupiter",
    elements: { a0: 0.0071551821, adot: 0, e0: 0.001, edot: 0, I0: 0.2, Idot: 0, L0: 221.6, Ldot: 1837850.667, peri0: 256.8, peridot: 527.0787, node0: 58.5, nodedot: 261.2254 }
  },
  Callisto: {
    primary: "Jupiter",
    elements: { a0: 0.0125850722, adot: 0, e0: 0.007, edot: 0, I0: 0.3, Idot: 0, L0: 80.3, Ldot: 787883.385, peri0: 352.9, peridot: 129.5332, node0: 309.1, nodedot: 62.3631 }
  },
  Mimas: {
    primary: "Saturn",
    elements: { a0: 0.0012433332, adot: 0, e0: 0.02, edot: 0, I0: 1.6, Idot: 0, L0: 141.9, Ldot: 13952348.311, peri0: 226.6, peridot: 73022.3124, node0: 66.2, nodedot: 36511.1562 }
  },
  Enceladus: {
    primary: "Saturn",
    elements: { a0: 0.0015936056, adot: 0, e0: 0.005, edot: 0, I0: 0, Idot: 0, L0: 176.5, Ldot: 9596283.219, peri0: 119.5, peridot: 12345.679, node0: 0, nodedot: 0 }
  },
  Titan: {
    primary: "Saturn",
    elements: { a0: 0.008167897, adot: 0, e0: 0.029, edot: 0, I0: 0.3, Idot: 0, L0: 168.6, Ldot: 824625.452, peri0: 156.9, peridot: 103.8422, node0: 78.6, nodedot: 52.3735 }
  },
  Miranda: {
    primary: "Uranus",
    elements: { a0: 0.0008683279, adot: 0, e0: 0.001, edot: 0, I0: 4.4, Idot: 0, L0: 328.7, Ldot: 9302578.956, peri0: 256.3, peridot: 4028.6482, node0: 100.7, nodedot: 2024.7469 }
  },
  Triton: {
    primary: "Neptune",
    elements: { a0: 0.0023716915, adot: 0, e0: 0, edot: 0, I0: 157.3, Idot: 0, L0: 241.1, Ldot: 2237421.586, peri0: 178.1, peridot: 0, node0: 178.1, nodedot: 105.7645 }
  },
  Charon: {
    primary: "Pluto",
    elements: { a0: 0.0001310179, adot: 0, e0: 0, edot: 0, I0: 0, Idot: 0, L0: 304.65, Ldot: 2058638.749, peri0: 0, peridot: 0, node0: 0, nodedot: 0 }
  }
};

// ---- Dwarf planets ----
//
// Heliocentric elements like the planets. Pluto uses the classic JPL
// "Approximate Positions of the Planets" Pluto row (Standish & Williams,
// https://ssd.jpl.nasa.gov/planets/approx_pos.html) — the same element
// family as the planets; the modern page's tables cover the eight planets
// only, so the Pluto values are taken from the classic publication (as
// transcribed verbatim by the jsorrery project). Ceres, Eris, Makemake and
// Haumea use their JPL Small-Body Database osculating elements
// (https://ssd.jpl.nasa.gov/tools/sbdb_lookup) at the published epoch,
// converted to the J2000 mean-longitude form: L0 = Ω + ω + M shifted from
// the element epoch to J2000 by the mean motion; their published rates are
// zero.

export const DWARF_NAMES = ["Pluto", "Ceres", "Eris", "Makemake", "Haumea"] as const;

export type DwarfName = (typeof DWARF_NAMES)[number];

export const DWARF_ELEMENTS: Record<DwarfName, OrbitalElements> = {
  Pluto: {
    a0: 39.48211675,
    adot: -0.00031596,
    e0: 0.2488273,
    edot: 0.0000517,
    I0: 17.14001206,
    Idot: 0.00004818,
    L0: 238.92903833,
    Ldot: 145.20780515,
    peri0: 224.06891629,
    peridot: -0.04062942,
    node0: 110.30393684,
    nodedot: -0.01183482
  },
  Ceres: {
    a0: 2.767218108,
    adot: 0,
    e0: 0.0761029213,
    edot: 0,
    I0: 10.60069568,
    Idot: 0,
    L0: 160.7871101,
    Ldot: 7820.404202,
    peri0: 152.1077304,
    peridot: 0,
    node0: 80.65851514,
    nodedot: 0
  },
  Eris: {
    a0: 67.72049984,
    adot: 0,
    e0: 0.4402757255,
    edot: 0,
    I0: 44.16476529,
    Idot: 0,
    L0: 20.75630244,
    Ldot: 64.5972384,
    peri0: 187.4142787,
    peridot: 0,
    node0: 35.88169902,
    nodedot: 0
  },
  Makemake: {
    a0: 45.37454856,
    adot: 0,
    e0: 0.1626228804,
    edot: 0,
    I0: 29.00057607,
    Idot: 0,
    L0: 155.7435261,
    Ldot: 117.7811448,
    peri0: 14.71445739,
    peridot: 0,
    node0: 79.52652691,
    nodedot: 0
  },
  Haumea: {
    a0: 43.11668587,
    adot: 0,
    e0: 0.1953963725,
    edot: 0,
    I0: 28.22415297,
    Idot: 0,
    L0: 192.6175199,
    Ldot: 127.1528754,
    peri0: 1.343529275,
    peridot: 0,
    node0: 122.10186,
    nodedot: 0
  }
};

export const PLANET_ELEMENTS: Record<PlanetName, OrbitalElements> = {
  Mercury: {
    a0: 0.38709927,
    adot: 0.00000037,
    e0: 0.20563593,
    edot: 0.00001906,
    I0: 7.00497902,
    Idot: -0.00594749,
    L0: 252.2503235,
    Ldot: 149472.67411175,
    peri0: 77.45779628,
    peridot: 0.16047689,
    node0: 48.33076593,
    nodedot: -0.12534081
  },
  Venus: {
    a0: 0.72333566,
    adot: 0.0000039,
    e0: 0.00677672,
    edot: -0.00004107,
    I0: 3.39467605,
    Idot: -0.0007889,
    L0: 181.9790995,
    Ldot: 58517.81538729,
    peri0: 131.60246718,
    peridot: 0.00268329,
    node0: 76.67984255,
    nodedot: -0.27769418
  },
  Earth: {
    a0: 1.00000261,
    adot: 0.00000562,
    e0: 0.01671123,
    edot: -0.00004392,
    I0: -0.00001531,
    Idot: -0.01294668,
    L0: 100.46457166,
    Ldot: 35999.37244981,
    peri0: 102.93768193,
    peridot: 0.32327364,
    node0: 0.0,
    nodedot: 0.0
  },
  Mars: {
    a0: 1.52371034,
    adot: 0.00001847,
    e0: 0.0933941,
    edot: 0.00007882,
    I0: 1.84969142,
    Idot: -0.00813131,
    L0: -4.55343205,
    Ldot: 19140.30268499,
    peri0: -23.94362959,
    peridot: 0.44441088,
    node0: 49.55953891,
    nodedot: -0.29257343
  },
  Jupiter: {
    a0: 5.202887,
    adot: -0.00011607,
    e0: 0.04838624,
    edot: -0.00013253,
    I0: 1.30439695,
    Idot: -0.00183714,
    L0: 34.39644051,
    Ldot: 3034.74612775,
    peri0: 14.72847983,
    peridot: 0.21252668,
    node0: 100.47390909,
    nodedot: 0.20469106
  },
  Saturn: {
    a0: 9.53667594,
    adot: -0.0012506,
    e0: 0.05386179,
    edot: -0.00050991,
    I0: 2.48599187,
    Idot: 0.00193609,
    L0: 49.95424423,
    Ldot: 1222.49362201,
    peri0: 92.59887831,
    peridot: -0.41897216,
    node0: 113.66242448,
    nodedot: -0.28867794
  },
  Uranus: {
    a0: 19.18916464,
    adot: -0.00196176,
    e0: 0.04725744,
    edot: -0.00004397,
    I0: 0.77263783,
    Idot: -0.00242939,
    L0: 313.23810451,
    Ldot: 428.48202785,
    peri0: 170.9542763,
    peridot: 0.40805281,
    node0: 74.01692503,
    nodedot: 0.04240589
  },
  Neptune: {
    a0: 30.06992276,
    adot: 0.00026291,
    e0: 0.00859048,
    edot: 0.00005105,
    I0: 1.77004347,
    Idot: 0.00035372,
    L0: -55.12002969,
    Ldot: 218.45945325,
    peri0: 44.96476227,
    peridot: -0.32241464,
    node0: 131.78422574,
    nodedot: -0.00508664
  }
};
