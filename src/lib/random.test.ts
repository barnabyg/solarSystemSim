import { describe, expect, it } from "vitest";
import { createRng } from "./random";

// The scene builds its procedural visuals — the asteroid belt's particle
// orbits, the starfield, the nebula blotches — from random values, and the
// golden screenshot suite (ticket #13, ADR-0004 seam 4) needs those visuals
// to render identically on every boot. These tests pin the generator's
// contract: deterministic per seed, in range, and not constant.

describe("createRng", () => {
  it("is deterministic: the same seed yields the same sequence", () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("draws values in [0, 1)", () => {
    const rand = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is not constant: a single seed produces varied values", () => {
    const rand = createRng(1);
    const first = rand();
    let distinct = 0;
    for (let i = 0; i < 100; i++) {
      if (rand() !== first) distinct++;
    }
    expect(distinct).toBeGreaterThan(90);
  });

  it("different seeds diverge", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA.some((value, i) => value !== seqB[i])).toBe(true);
  });
});
