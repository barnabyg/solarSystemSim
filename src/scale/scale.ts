/**
 * Scale module: maps physical scale to display scale.
 *
 * Compressed mode (ADR-0002) is the playable default: bodies are enlarged and
 * gaps shrunk so the whole system fits one view. Distances scale as
 * `distanceScale * a^distanceExponent` (square root by default — inner
 * planets keep separation, the outer system is pulled in); body radii scale
 * as `sizeScale * sqrt(km)` clamped to a readable range. A true-scale toggle
 * arrives with its own ticket.
 *
 * Pure functions, no rendering or I/O — the seam under test.
 */

import { clamp } from "../lib/math";
import type { Vec3 } from "../orbit/kepler";

export interface CompressedScaleConfig {
  /** Display units per AU at a = 1. */
  distanceScale: number;
  /** Distance compression exponent: 1 is linear, < 1 compresses the outer system. */
  distanceExponent: number;
  /** Display units per sqrt(km) for body radii. */
  sizeScale: number;
  /** Smallest body radius in display units. */
  minBodyRadius: number;
  /** Largest body radius in display units. */
  maxBodyRadius: number;
}

export const COMPRESSED_SCALE: CompressedScaleConfig = {
  distanceScale: 3,
  distanceExponent: 0.5,
  sizeScale: 0.002,
  minBodyRadius: 0.08,
  maxBodyRadius: 0.85
};

/**
 * Compressed display distance for a semi-major axis `au` [AU].
 */
export function compressedDistance(au: number, config: CompressedScaleConfig = COMPRESSED_SCALE): number {
  return config.distanceScale * Math.pow(au, config.distanceExponent);
}

/**
 * Compressed display radius for a physical radius `km` [km], clamped to the
 * readable range so no body vanishes or swallows its neighbours.
 */
export function compressedRadius(km: number, config: CompressedScaleConfig = COMPRESSED_SCALE): number {
  return clamp(config.sizeScale * Math.sqrt(km), config.minBodyRadius, config.maxBodyRadius);
}

/**
 * Map an ecliptic heliocentric position [AU] to compressed display units,
 * preserving direction so orbit shapes, inclinations and node orientations
 * survive the compression.
 */
export function scalePosition(p: Vec3, config: CompressedScaleConfig = COMPRESSED_SCALE): Vec3 {
  const r = Math.hypot(p.x, p.y, p.z);
  if (r === 0) return { x: 0, y: 0, z: 0 };
  const s = compressedDistance(r, config) / r;
  return { x: p.x * s, y: p.y * s, z: p.z * s };
}

/**
 * Convert an ecliptic J2000 position to the Three.js world frame: the
 * ecliptic plane (x-y) becomes horizontal (world x-z), ecliptic north (+z)
 * becomes world +y, matching three's right-handed, y-up convention.
 */
export function eclipticToWorld(p: Vec3): Vec3 {
  return { x: p.x, y: p.z, z: -p.y };
}
