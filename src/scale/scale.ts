/**
 * Scale module: maps physical scale to display scale.
 *
 * Compressed mode (ADR-0002) is the playable default: bodies are enlarged and
 * gaps shrunk so the whole system fits one view. Distances scale as
 * `distanceScale * a^distanceExponent` (square root by default — inner
 * planets keep separation, the outer system is pulled in); body radii scale
 * as `sizeScale * sqrt(km)` clamped to a readable range.
 *
 * True-scale mode (ticket #10) shows the real emptiness of space: heliocentric
 * distances are linear in AU (`distancePerAu * au` — the real ratio between
 * bodies survives exactly), while body radii keep a readable minimum size so
 * no body vanishes (ADR-0002; full honesty in body size was rejected).
 * The dispatch functions `scaleDistance` / `scaleRadius` / `scalePosition`
 * pick the mode's mapping, and `scaleDistanceRatio` gives the camera the
 * zoom-out factor for the toggle.
 *
 * Moon orbits need their own mapping in *both* modes: a moon's planetocentric
 * distance is tiny in AU, so the raw distance scale would bury every moon
 * inside its enlarged primary's display sphere. Moons are placed relative to
 * the primary's display radius instead — the physical ratio (orbit ÷ primary
 * radius) survives, heavily compressed, floored above the disc. The scene
 * passes the primary's display radius (per the active mode), so the moon
 * functions are mode-independent.
 *
 * Pure functions, no rendering or I/O — the seam under test.
 */

import { clamp } from "../lib/math";
import type { Vec3 } from "../orbit/kepler";

/** Which scale mode the scene is rendering in (CONTEXT.md). */
export type ScaleMode = "compressed" | "true";

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

export interface TrueScaleConfig {
  /** Display units per AU — distances are linear and real in this mode. */
  distancePerAu: number;
  /** Display units per km for body radii — real size ratios, floored. */
  radiusPerKm: number;
  /** Smallest body radius in display units (the readable minimum). */
  minBodyRadius: number;
  /** Largest body radius in display units. */
  maxBodyRadius: number;
}

/**
 * True-scale constants: 3 display units per AU puts Neptune (30.07 AU) at
 * ~90 units, which the camera (MAX_DISTANCE 300) frames at the overview
 * zoom-out; 1e-6 display units per km leaves the Sun (696,340 km) the only
 * body above the 0.1 floor, so it renders largest while every planet is a
 * readable dot at its real distance.
 */
export const TRUE_SCALE: TrueScaleConfig = {
  distancePerAu: 3,
  radiusPerKm: 0.000001,
  minBodyRadius: 0.1,
  maxBodyRadius: 0.9
};

/** One astronomical unit, exactly 149,597,870.7 km (IAU definition). */
export const AU_KM = 149597870.7;

/**
 * Moon orbits never render inside the primary's display sphere: the closest a
 * moon can sit is `MOON_ORBIT_MIN_RADII` × the primary's display radius.
 */
export const MOON_ORBIT_MIN_RADII = 1.6;
/**
 * How much of the real orbit-to-primary ratio survives. The Moon really
 * orbits at 60 Earth radii; with a compression of 0.08 it displays at
 * 1.6 + 59 × 0.08 ≈ 6.3 Earth radii — clear of the disc yet visibly
 * planet-hugging, and moons of one primary keep their physical order.
 */
export const MOON_ORBIT_COMPRESSION = 0.08;

/**
 * Compressed display distance for a semi-major axis `au` [AU].
 */
export function compressedDistance(au: number, config: CompressedScaleConfig = COMPRESSED_SCALE): number {
  return config.distanceScale * Math.pow(au, config.distanceExponent);
}

/**
 * True-scale display distance for `au` [AU]: linear in AU, so the real
 * distance ratio between bodies survives exactly (the point of the mode).
 */
export function trueScaleDistance(au: number, config: TrueScaleConfig = TRUE_SCALE): number {
  return au * config.distancePerAu;
}

/**
 * Display distance for `au` [AU] in the active mode — the dispatch the scene
 * uses so a mode change needs no call-site edits.
 */
export function scaleDistance(
  au: number,
  mode: ScaleMode,
  compressed: CompressedScaleConfig = COMPRESSED_SCALE,
  trueScale: TrueScaleConfig = TRUE_SCALE
): number {
  return mode === "true" ? trueScaleDistance(au, trueScale) : compressedDistance(au, compressed);
}

/**
 * Ratio of the true-scale display distance to the compressed display distance
 * at `au` — how much larger the system renders in true-scale mode there. The
 * camera zooms out by this factor (measured at the outer system) when the
 * toggle flips, so the view stays framed.
 */
export function scaleDistanceRatio(
  au: number,
  compressed: CompressedScaleConfig = COMPRESSED_SCALE,
  trueScale: TrueScaleConfig = TRUE_SCALE
): number {
  return trueScaleDistance(au, trueScale) / compressedDistance(au, compressed);
}

/**
 * Compressed display radius for a physical radius `km` [km], clamped to the
 * readable range so no body vanishes or swallows its neighbours.
 */
export function compressedRadius(km: number, config: CompressedScaleConfig = COMPRESSED_SCALE): number {
  return clamp(config.sizeScale * Math.sqrt(km), config.minBodyRadius, config.maxBodyRadius);
}

/**
 * True-scale display radius for a physical radius `km` [km]: linear in km
 * (real size ratios above the floor) clamped to a readable minimum so no
 * body vanishes at the real emptiness (ADR-0002).
 */
export function trueScaleRadius(km: number, config: TrueScaleConfig = TRUE_SCALE): number {
  return clamp(km * config.radiusPerKm, config.minBodyRadius, config.maxBodyRadius);
}

/**
 * Display radius for a physical radius `km` [km] in the active mode — the
 * dispatch the scene uses for body meshes, focus distances, and moon
 * primaries.
 */
export function scaleRadius(
  km: number,
  mode: ScaleMode,
  compressed: CompressedScaleConfig = COMPRESSED_SCALE,
  trueScale: TrueScaleConfig = TRUE_SCALE
): number {
  return mode === "true" ? trueScaleRadius(km, trueScale) : compressedRadius(km, compressed);
}

/**
 * Map an ecliptic heliocentric position [AU] to display units in the active
 * mode, preserving direction so orbit shapes, inclinations and node
 * orientations survive the mapping.
 */
export function scalePosition(
  p: Vec3,
  mode: ScaleMode = "compressed",
  compressed: CompressedScaleConfig = COMPRESSED_SCALE,
  trueScale: TrueScaleConfig = TRUE_SCALE
): Vec3 {
  const r = Math.hypot(p.x, p.y, p.z);
  if (r === 0) return { x: 0, y: 0, z: 0 };
  const s = scaleDistance(r, mode, compressed, trueScale) / r;
  return { x: p.x * s, y: p.y * s, z: p.z * s };
}

/**
 * Compressed display radius of a moon's orbit around its primary: the moon's
 * planetocentric distance `moonDistanceAu` [AU] is expressed in units of the
 * primary's physical radius, compressed so the rendered system stays compact,
 * and floored above the primary's disc so the moon never renders inside it.
 */
export function compressedMoonOrbitRadius(
  primaryRadiusKm: number,
  primaryDisplayRadius: number,
  moonDistanceAu: number
): number {
  const radii = (moonDistanceAu * AU_KM) / primaryRadiusKm;
  const displayRadii = MOON_ORBIT_MIN_RADII + Math.max(radii - 1, 0) * MOON_ORBIT_COMPRESSION;
  return primaryDisplayRadius * displayRadii;
}

/**
 * Map a planetocentric position [AU] to the compressed display frame around
 * the primary (whose mesh sits at the origin of this frame): direction and
 * orbit shape survive, the radius becomes the compressed moon orbit distance.
 */
export function scaleMoonPosition(
  primaryRadiusKm: number,
  primaryDisplayRadius: number,
  p: Vec3
): Vec3 {
  const r = Math.hypot(p.x, p.y, p.z);
  if (r === 0) return { x: 0, y: 0, z: 0 };
  const s = compressedMoonOrbitRadius(primaryRadiusKm, primaryDisplayRadius, r) / r;
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
