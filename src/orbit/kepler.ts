/**
 * Keplerian orbital mechanics (heliocentric, ecliptic J2000 frame).
 *
 * Implements the JPL "Approximate Positions of the Planets" algorithm
 * (Standish & Williams 1992, as published at
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html): elements and rates
 * evaluated at T centuries past J2000.0, Kepler's equation solved by Newton
 * iteration, and the orbital-plane -> ecliptic rotation given on that page.
 *
 * The frame is heliocentric: the Sun is the origin by definition, so it has
 * no elements and no position computation.
 *
 * Pure functions, no rendering or I/O — the seam under test.
 */

export type Vec3 = { x: number; y: number; z: number };

export interface OrbitalElements {
  /** Semi-major axis [AU] and its rate [AU/century]. */
  a0: number;
  adot: number;
  /** Eccentricity and its rate. */
  e0: number;
  edot: number;
  /** Inclination [deg] and rate [deg/century]. */
  I0: number;
  Idot: number;
  /** Mean longitude [deg] and rate [deg/century]. */
  L0: number;
  Ldot: number;
  /** Longitude of perihelion [deg] and rate [deg/century]. */
  peri0: number;
  peridot: number;
  /** Longitude of ascending node [deg] and rate [deg/century]. */
  node0: number;
  nodedot: number;
}

const DEG = Math.PI / 180;
const DAYS_PER_CENTURY = 36525;
const KEPLER_ITERATIONS = 8;
/** Gaussian gravitational constant, rad/day in AU and solar-mass units. */
const GAUSS_K = 0.01720209895;

/**
 * Orbital period in days for a semi-major axis `a` [AU] (Kepler's third law).
 */
export function orbitalPeriodDays(a: number): number {
  return (2 * Math.PI * Math.pow(a, 1.5)) / GAUSS_K;
}

function reduceDegrees(angle: number): number {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

/**
 * Heliocentric ecliptic position of a body, in AU, at `daysSinceJ2000`
 * days past the J2000.0 epoch (JD 2451545.0 TT).
 */
export function positionAt(elements: OrbitalElements, daysSinceJ2000: number): Vec3 {
  const T = daysSinceJ2000 / DAYS_PER_CENTURY;

  const a = elements.a0 + elements.adot * T;
  const e = elements.e0 + elements.edot * T;
  const I = (elements.I0 + elements.Idot * T) * DEG;
  const L = elements.L0 + elements.Ldot * T;
  const peri = elements.peri0 + elements.peridot * T;
  const nodeDeg = elements.node0 + elements.nodedot * T;
  const node = nodeDeg * DEG;
  const omega = (peri - nodeDeg) * DEG;

  const Mrad = reduceDegrees(L - peri) * DEG;

  // Solve Kepler's equation M = E - e sin E by Newton iteration.
  let E = Mrad;
  for (let i = 0; i < KEPLER_ITERATIONS; i++) {
    E -= (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
  }

  // Heliocentric position in the orbital plane (x' toward perihelion).
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate orbital plane -> ecliptic J2000 (JPL matrix).
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosO = Math.cos(node);
  const sinO = Math.sin(node);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  return {
    x: (cosw * cosO - sinw * sinO * cosI) * xp + (-sinw * cosO - cosw * sinO * cosI) * yp,
    y: (cosw * sinO + sinw * cosO * cosI) * xp + (-sinw * sinO + cosw * cosO * cosI) * yp,
    z: sinw * sinI * xp + cosw * sinI * yp
  };
}
