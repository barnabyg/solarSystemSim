import { describe, expect, it } from "vitest";
import {
  COMPRESSED_SCALE,
  compressedDistance,
  compressedRadius,
  eclipticToWorld,
  scalePosition,
  type CompressedScaleConfig
} from "./scale";
import { PLANET_ELEMENTS, PLANET_NAMES } from "../orbit/elements";
import { PLANET_VISUALS } from "../body/catalog";

// Independent check values are hand-computed from the config literals
// (distanceScale = 3, exponent = 0.5, sizeScale = 0.002, min = 0.08,
// max = 0.85) — not recomputed by the code under test.

describe("compressedDistance", () => {
  it("maps 1 AU to the distance scale", () => {
    expect(compressedDistance(1)).toBeCloseTo(3, 10);
  });

  it("grows as the square root of the semi-major axis", () => {
    // sqrt(0.387) ≈ 0.6220765; sqrt(30.06992276) ≈ 5.483605.
    expect(compressedDistance(0.387)).toBeCloseTo(1.86623, 3);
    expect(compressedDistance(30.06992276)).toBeCloseTo(16.4508, 3);
  });

  it("keeps inner planets closer than outer planets", () => {
    const a = PLANET_ELEMENTS;
    // PLANET_NAMES is the canonical Sun-outward order from the orbit module.
    for (let i = 1; i < PLANET_NAMES.length; i++) {
      const inner = compressedDistance(a[PLANET_NAMES[i - 1]].a0);
      const outer = compressedDistance(a[PLANET_NAMES[i]].a0);
      expect(outer).toBeGreaterThan(inner);
    }
  });

  it("compresses the outer system relative to linear scale", () => {
    const neptune = PLANET_ELEMENTS.Neptune.a0;
    const mercury = PLANET_ELEMENTS.Mercury.a0;
    const linearRatio = neptune / mercury;
    const compressedRatio = compressedDistance(neptune) / compressedDistance(mercury);
    expect(compressedRatio).toBeLessThan(linearRatio);
    // sqrt law: compressed ratio = sqrt(linear ratio) for equal exponents.
    expect(compressedRatio).toBeCloseTo(Math.sqrt(linearRatio), 6);
  });

  it("honors a custom config", () => {
    const config: CompressedScaleConfig = { ...COMPRESSED_SCALE, distanceScale: 5 };
    expect(compressedDistance(1, config)).toBeCloseTo(5, 10);
  });
});

describe("compressedRadius", () => {
  it("maps Earth's radius to the expected display radius", () => {
    // sqrt(6371) ≈ 79.8185 → 0.002 * 79.8185 ≈ 0.1596.
    expect(compressedRadius(6371)).toBeCloseTo(0.1596, 3);
  });

  it("enlarges bodies monotonically with physical radius", () => {
    // Radii come from the catalog — the single source of truth — so a data
    // correction needs one edit, not three.
    const radiiKm = PLANET_NAMES.map((name) => PLANET_VISUALS[name].radiusKm);
    for (let i = 1; i < radiiKm.length; i++) {
      const prev = radiiKm[i - 1];
      const km = radiiKm[i];
      if (prev < km) {
        expect(compressedRadius(km)).toBeGreaterThan(compressedRadius(prev));
      }
    }
  });

  it("clamps oversized bodies (the Sun) to the maximum", () => {
    expect(compressedRadius(696340)).toBe(COMPRESSED_SCALE.maxBodyRadius);
  });

  it("clamps tiny bodies to the readable minimum", () => {
    expect(compressedRadius(10)).toBe(COMPRESSED_SCALE.minBodyRadius);
  });
});

describe("scalePosition", () => {
  it("scales a point on the x axis radially", () => {
    expect(scalePosition({ x: 1, y: 0, z: 0 })).toEqual({ x: 3, y: 0, z: 0 });
    // sqrt(2) ≈ 1.41421.
    expect(scalePosition({ x: 2, y: 0, z: 0 }).x).toBeCloseTo(4.24264, 4);
  });

  it("preserves direction", () => {
    const p = { x: 3, y: 4, z: 0 }; // r = 5, scale factor 3*sqrt(5)/5 ≈ 1.34164
    const s = scalePosition(p);
    expect(s.y / s.x).toBeCloseTo(4 / 3, 10);
    expect(s.x).toBeCloseTo(4.02492, 4);
    expect(s.y).toBeCloseTo(5.36656, 4);
    expect(s.z).toBe(0);
  });

  it("keeps the Sun at the origin", () => {
    expect(scalePosition({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("maps an ecliptic position to the same display distance as compressedDistance", () => {
    const p = { x: 1.52371034, y: 0.5, z: 0.1 };
    const r = Math.hypot(p.x, p.y, p.z);
    const s = scalePosition(p);
    const scaledR = Math.hypot(s.x, s.y, s.z);
    expect(scaledR).toBeCloseTo(compressedDistance(r), 10);
  });
});

describe("eclipticToWorld", () => {
  it("lays the ecliptic plane horizontal (world y = ecliptic z)", () => {
    expect(eclipticToWorld({ x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 3, z: -2 });
  });

  it("maps ecliptic north to world +y", () => {
    const north = eclipticToWorld({ x: 0, y: 0, z: 1 });
    expect(north.x).toBe(0);
    expect(north.y).toBe(1);
    // -0 === 0, but toBe uses Object.is; toBeCloseTo accepts both.
    expect(north.z).toBeCloseTo(0, 10);
  });
});
