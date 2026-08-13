/**
 * Body catalog: rendering data for the Sun and the eight planets.
 *
 * Orbital elements live in `src/orbit/elements.ts`; fact-card fields arrive
 * with the full-catalog ticket. Planet entries are keyed by their name (the
 * same key the orbit module uses); radii are the JPL/NASA published
 * equatorial values [km]; colors are the stylized surface tints used by the
 * scene.
 */

import type { PlanetName } from "../orbit/elements";

export interface BodyVisual {
  /** Physical equatorial radius [km], published value. */
  radiusKm: number;
  /** Stylized surface color. */
  color: number;
}

/** Display name of the Sun — it has no orbit-module key, so it needs one. */
export const SUN_NAME = "Sun";

export const SUN: BodyVisual = {
  radiusKm: 696340,
  color: 0xffcc66
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
