import { describe, expect, it } from "vitest";
import {
  AU_KM,
  COMPRESSED_SCALE,
  compressedDistance,
  compressedMoonOrbitRadius,
  compressedRadius,
  eclipticToWorld,
  scaleMoonPosition,
  scalePosition,
  type CompressedScaleConfig
} from "./scale";
import { MOON_ELEMENTS, MOON_NAMES, PLANET_ELEMENTS, PLANET_NAMES } from "../orbit/elements";
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

// ---- Moon orbit display scale (ticket #8) --------------------------------
//
// A moon's planetocentric distance is tiny in AU (1e-4..1e-2), so the raw
// compressed scale would bury every moon inside its enlarged primary's
// display sphere. Moons are placed relative to the primary's display radius
// instead: the physical ratio (orbit ÷ primary radius) survives, heavily
// compressed, floored above the disc. Expected values are hand-computed from
// the literals (AU_KM, min 1.6 radii, compression 0.08) — not recomputed by
// the code under test.

/** Display radius of a primary, matching the scene's mesh sizing. */
function primaryDisplayRadius(radiusKm: number): number {
  return compressedRadius(radiusKm);
}

describe("compressedMoonOrbitRadius", () => {
  it("places the Moon at the hand-computed compressed distance from Earth", () => {
    // Moon orbit = 0.0025695553 AU × AU_KM ≈ 384,400 km ≈ 60.34 Earth radii.
    // displayRadii = 1.6 + 59.34 × 0.08 = 6.347; Earth displays at 0.15964.
    const d = compressedMoonOrbitRadius(6371, primaryDisplayRadius(6371), 0.0025695553);
    expect(d).toBeCloseTo(1.013, 2);
  });

  it("keeps Phobos just outside Mars's display sphere", () => {
    // Phobos orbit ≈ 9,400 km ≈ 2.77 Mars radii → displayRadii ≈ 1.742.
    const mars = primaryDisplayRadius(3389.5);
    const d = compressedMoonOrbitRadius(3389.5, mars, 0.0000628351);
    expect(d).toBeGreaterThan(mars);
    expect(d).toBeCloseTo(0.203, 2);
  });

  it("keeps Charon outside Pluto's display sphere", () => {
    // Charon orbits the dwarf planet Pluto (not a planet): the function must
    // work for any primary, including tiny Pluto's small display radius.
    const pluto = primaryDisplayRadius(1188.3);
    const d = compressedMoonOrbitRadius(1188.3, pluto, 0.0001310179);
    expect(d).toBeGreaterThan(pluto);
  });

  it("orders each primary's moons by physical distance", () => {
    // Group the 13 moons by primary; within each group the rendered order
    // must match the physical order, so no moon visually overtakes another.
    const byPrimary = new Map<string, (typeof MOON_NAMES)[number][]>();
    for (const moon of MOON_NAMES) {
      const primary = MOON_ELEMENTS[moon].primary;
      byPrimary.set(primary, [...(byPrimary.get(primary) ?? []), moon]);
    }
    for (const [primary, moons] of byPrimary) {
      const primaryKm =
        primary === "Pluto"
          ? 1188.3 // DWARF_VISUALS.Pluto.radiusKm
          : PLANET_VISUALS[primary as (typeof PLANET_NAMES)[number]].radiusKm;
      const display = primaryDisplayRadius(primaryKm);
      // The mapping is monotonic in physical distance, so the rendered order
      // must follow the physical order whatever the catalog's group order is.
      const physical = [...moons].sort(
        (a, b) => MOON_ELEMENTS[a].elements.a0 - MOON_ELEMENTS[b].elements.a0
      );
      const rendered = physical.map((m) =>
        compressedMoonOrbitRadius(primaryKm, display, MOON_ELEMENTS[m].elements.a0)
      );
      for (let i = 1; i < rendered.length; i++) {
        expect(rendered[i]).toBeGreaterThan(rendered[i - 1]);
      }
    }
  });

  it("never returns a distance inside the primary's display sphere", () => {
    // Even an unrealistically close moon (1.1 primary radii, inside the Roche
    // limit) must render clear of the disc rather than inside the mesh.
    const earth = primaryDisplayRadius(6371);
    expect(compressedMoonOrbitRadius(6371, earth, 0.00005)).toBeGreaterThan(earth);
  });
});

describe("scaleMoonPosition", () => {
  it("maps a planetocentric position to the compressed orbit distance", () => {
    // Direction (3:2 in the ecliptic plane) must survive; only the radius
    // changes, to the Moon's compressed distance computed above.
    const p = { x: 0.0024, y: 0.0016, z: 0 };
    const s = scaleMoonPosition(6371, primaryDisplayRadius(6371), p);
    const r = Math.hypot(p.x, p.y, p.z);
    expect(Math.hypot(s.x, s.y, s.z)).toBeCloseTo(
      compressedMoonOrbitRadius(6371, primaryDisplayRadius(6371), r),
      10
    );
    expect(s.y / s.x).toBeCloseTo(0.0016 / 0.0024, 10);
  });

  it("keeps the primary's center at the origin", () => {
    expect(scaleMoonPosition(6371, primaryDisplayRadius(6371), { x: 0, y: 0, z: 0 })).toEqual({
      x: 0,
      y: 0,
      z: 0
    });
  });

  it("documents the AU constant in km", () => {
    // The IAU definition: 1 AU = 149,597,870.7 km exactly.
    expect(AU_KM).toBe(149597870.7);
  });
});
