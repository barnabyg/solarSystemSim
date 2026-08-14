/**
 * Deterministic pseudo-random number generator.
 *
 * The scene builds its procedural visuals — the asteroid belt's particle
 * orbits, the starfield layers, the nebula blotches — from random values, and
 * the golden screenshot suite (ticket #13, ADR-0004 seam 4) needs those
 * visuals to render identically on every boot: with `Math.random()` the belt
 * would scatter differently on each load and the goldens would never settle.
 * This module provides a small seeded generator (mulberry32) so construction
 * is reproducible — same seed, same sequence, same scene.
 */

/**
 * Create a generator of values in [0, 1) from a 32-bit seed. The same seed
 * always yields the same sequence; different seeds diverge.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
