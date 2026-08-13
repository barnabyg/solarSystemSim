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
