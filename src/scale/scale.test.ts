import { describe, expect, it } from "vitest";
import {
  AU_KM,
  COMPRESSED_SCALE,
  MOON_ORBIT_MAX_GAP_FRACTION,
  MOON_ORBIT_MIN_RADII,
  TRUE_SCALE,
  compressedDistance,
  compressedMoonOrbitRadius,
  compressedRadius,
  eclipticToWorld,
  moonOrbitMaxRadius,
  scaleDistance,
  scaleDistanceRatio,
  scaleMoonPosition,
  scalePosition,
  scaleRadius,
  trueScaleDistance,
  trueScaleRadius,
  type CompressedScaleConfig,
  type MoonOrbitNeighborhood,
  type TrueScaleConfig
} from "./scale";
import { MOON_ELEMENTS, MOON_NAMES, PLANET_ELEMENTS, PLANET_NAMES, type MoonName, type PlanetName } from "../orbit/elements";
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

// ---- True-scale mode (ticket #10) ----------------------------------------
//
// True-scale mode shows real heliocentric distances — display distance is
// linear in AU — while bodies keep a readable minimum size (ADR-0002).
// Independent check values are hand-computed from the config literals
// (distancePerAu = 3, radiusPerKm = 1e-6, min = 0.1, max = 0.9), and the
// planet ratios come from the orbit module's semi-major axes — not
// recomputed by the code under test.

const NEPTUNE_AU = PLANET_ELEMENTS.Neptune.a0; // 30.06992276

describe("trueScaleDistance", () => {
  it("maps 1 AU to the distance-per-AU constant", () => {
    expect(trueScaleDistance(1)).toBeCloseTo(TRUE_SCALE.distancePerAu, 10);
  });

  it("is linear in AU — real distances", () => {
    expect(trueScaleDistance(2)).toBeCloseTo(TRUE_SCALE.distancePerAu * 2, 10);
    expect(trueScaleDistance(NEPTUNE_AU)).toBeCloseTo(TRUE_SCALE.distancePerAu * NEPTUNE_AU, 6);
  });

  it("keeps the real Earth-to-Neptune ratio", () => {
    // The whole point of true-scale mode: Neptune displays ~30× farther than
    // Earth, exactly its real distance ratio.
    const ratio = trueScaleDistance(NEPTUNE_AU) / trueScaleDistance(1);
    expect(ratio).toBeCloseTo(NEPTUNE_AU, 6);
  });

  it("honors a custom config", () => {
    const config: TrueScaleConfig = { ...TRUE_SCALE, distancePerAu: 5 };
    expect(trueScaleDistance(1, config)).toBeCloseTo(5, 10);
  });
});

describe("trueScaleRadius", () => {
  it("clamps small bodies to the readable minimum", () => {
    // 6371 km × 1e-6 = 0.0064, far below the 0.1 floor.
    expect(trueScaleRadius(6371)).toBe(TRUE_SCALE.minBodyRadius);
    expect(trueScaleRadius(69911)).toBe(TRUE_SCALE.minBodyRadius);
  });

  it("scales bodies above the floor linearly in km", () => {
    // 696340 km × 1e-6 = 0.69634 — the only body clear of the floor.
    expect(trueScaleRadius(696340)).toBeCloseTo(0.69634, 5);
  });

  it("renders the Sun largest", () => {
    expect(trueScaleRadius(696340)).toBeGreaterThan(trueScaleRadius(69911));
  });

  it("clamps oversized bodies to the maximum", () => {
    expect(trueScaleRadius(1e9)).toBe(TRUE_SCALE.maxBodyRadius);
  });
});

describe("scale mode dispatch", () => {
  it("scaleDistance picks the mode's distance mapping", () => {
    expect(scaleDistance(NEPTUNE_AU, "compressed")).toBeCloseTo(16.4508, 3);
    expect(scaleDistance(NEPTUNE_AU, "true")).toBeCloseTo(90.2098, 3);
    // At 1 AU the two mappings coincide by construction (distanceScale = 3).
    expect(scaleDistance(1, "compressed")).toBeCloseTo(scaleDistance(1, "true"), 10);
  });

  it("scaleRadius picks the mode's radius mapping", () => {
    expect(scaleRadius(6371, "compressed")).toBeCloseTo(0.1596, 3);
    expect(scaleRadius(6371, "true")).toBe(TRUE_SCALE.minBodyRadius);
  });

  it("scalePosition dispatches on the mode", () => {
    // 2 AU: compressed = 3·sqrt(2) ≈ 4.243, true = 3·2 = 6.
    expect(scalePosition({ x: 2, y: 0, z: 0 }, "compressed").x).toBeCloseTo(4.24264, 4);
    expect(scalePosition({ x: 2, y: 0, z: 0 }, "true")).toEqual({ x: 6, y: 0, z: 0 });
  });

  it("true-scale scalePosition preserves direction and the origin", () => {
    // r = 5, scale factor = 15 / 5 = 3.
    const s = scalePosition({ x: 3, y: 4, z: 0 }, "true");
    expect(s.y / s.x).toBeCloseTo(4 / 3, 10);
    expect(s.x).toBeCloseTo(9, 10);
    expect(s.y).toBeCloseTo(12, 10);
    expect(scalePosition({ x: 0, y: 0, z: 0 }, "true")).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe("scaleDistanceRatio", () => {
  it("is the ratio of true to compressed display distance at a given AU", () => {
    // true = 3·au, compressed = 3·sqrt(au) → ratio = sqrt(au).
    expect(scaleDistanceRatio(4)).toBeCloseTo(2, 10);
    expect(scaleDistanceRatio(1)).toBeCloseTo(1, 10);
  });

  it("measures the true-scale zoom-out factor at Neptune", () => {
    // The camera reframes by this factor when the toggle flips: ~sqrt(30).
    expect(scaleDistanceRatio(NEPTUNE_AU)).toBeCloseTo(Math.sqrt(NEPTUNE_AU), 6);
  });
});

describe("moon orbits in true-scale mode", () => {
  /** Primary display radius in true-scale mode, matching the scene. */
  function truePrimaryDisplayRadius(radiusKm: number): number {
    return trueScaleRadius(radiusKm);
  }

  it("keeps the Moon outside a true-scale Earth", () => {
    // Earth's true-scale disc is 0.1; the Moon's orbit maps to
    // 0.1 × (1.6 + 59.34 × 0.08) ≈ 0.635 — clear of the disc.
    const d = compressedMoonOrbitRadius(6371, truePrimaryDisplayRadius(6371), 0.0025695553);
    expect(d).toBeGreaterThan(truePrimaryDisplayRadius(6371));
    expect(d).toBeCloseTo(0.635, 2);
  });

  it("keeps every moon outside its primary's true-scale disc", () => {
    for (const moon of MOON_NAMES) {
      const primary = MOON_ELEMENTS[moon].primary;
      const primaryKm =
        primary === "Pluto"
          ? 1188.3
          : PLANET_VISUALS[primary as (typeof PLANET_NAMES)[number]].radiusKm;
      const display = truePrimaryDisplayRadius(primaryKm);
      const d = compressedMoonOrbitRadius(primaryKm, display, MOON_ELEMENTS[moon].elements.a0);
      expect(d).toBeGreaterThan(display);
    }
  });

  it("preserves each primary's physical moon order in true-scale mode", () => {
    const byPrimary = new Map<string, (typeof MOON_NAMES)[number][]>();
    for (const moon of MOON_NAMES) {
      const primary = MOON_ELEMENTS[moon].primary;
      byPrimary.set(primary, [...(byPrimary.get(primary) ?? []), moon]);
    }
    for (const [primary, moons] of byPrimary) {
      const primaryKm =
        primary === "Pluto"
          ? 1188.3
          : PLANET_VISUALS[primary as (typeof PLANET_NAMES)[number]].radiusKm;
      const display = truePrimaryDisplayRadius(primaryKm);
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

  it("clamps to the neighborhood max when passed one (ticket #20)", () => {
    // The Moon's unclamped far point is ~1.056 display units; Earth's
    // neighborhood bound is ~0.311 — the clamp wins and keeps the orbit
    // inside the Venus–Mars gap.
    const earth = primaryDisplayRadius(6371);
    const apo = 0.0025695553 * 1.0554; // a0 × (1 + e0)
    const unclamped = compressedMoonOrbitRadius(6371, earth, apo);
    const clamped = compressedMoonOrbitRadius(6371, earth, apo, 0.311);
    expect(unclamped).toBeGreaterThan(0.311);
    expect(clamped).toBe(0.311);
    // The clamp never pulls the orbit inside the primary's disc: the bound
    // stays above the disc-clearance floor.
    expect(clamped).toBeGreaterThan(earth * MOON_ORBIT_MIN_RADII);
  });

  it("leaves orbits already inside the neighborhood unclamped", () => {
    // Phobos's far point (~0.203) sits well inside Mars's bound (~0.376), so
    // passing the bound changes nothing.
    const mars = primaryDisplayRadius(3389.5);
    const apo = 0.0000628351 * 1.015; // a0 × (1 + e0)
    const d = compressedMoonOrbitRadius(3389.5, mars, apo, 0.376);
    expect(d).toBeCloseTo(0.203, 2);
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

  it("applies the neighborhood clamp to mapped positions", () => {
    // A point at the Moon's apocenter distance maps to the clamped radius,
    // not the unclamped one.
    const p = { x: 0.0027, y: 0, z: 0 };
    const s = scaleMoonPosition(6371, primaryDisplayRadius(6371), p, 0.311);
    expect(Math.hypot(s.x, s.y, s.z)).toBeCloseTo(0.311, 3);
  });

  it("documents the AU constant in km", () => {
    // The IAU definition: 1 AU = 149,597,870.7 km exactly.
    expect(AU_KM).toBe(149597870.7);
  });
});

// ---- Moon orbit neighborhood clamp (ticket #20) --------------------------
//
// The default compressed scale enlarges bodies and shrinks gaps (ADR-0002),
// and a moon orbit mapped purely off the primary's display radius can grow
// wider than the gap to the adjacent planet's orbit — the reported bug: the
// Moon's orbit extended past Venus's. `moonOrbitMaxRadius` bounds the orbit
// to a fraction of the smaller gap to the neighboring planets' orbit lines,
// measured at the extremes (primary perihelion vs inner-neighbor aphelion,
// outer-neighbor perihelion vs primary aphelion) so the bound holds at every
// sim date. Expected values are hand-computed from the config and element
// literals — not recomputed by the code under test.

/** Earth's orbital neighborhood from the element literals. */
function earthNeighborhood(): MoonOrbitNeighborhood {
  const earth = PLANET_ELEMENTS.Earth;
  const venus = PLANET_ELEMENTS.Venus;
  const mars = PLANET_ELEMENTS.Mars;
  return {
    perihelionAu: earth.a0 * (1 - earth.e0),
    aphelionAu: earth.a0 * (1 + earth.e0),
    innerNeighborAphelionAu: venus.a0 * (1 + venus.e0),
    outerNeighborPerihelionAu: mars.a0 * (1 - mars.e0)
  };
}

describe("moonOrbitMaxRadius", () => {
  it("bounds Earth's Moon inside the Venus–Mars gap (the reported bug)", () => {
    // Earth perihelion 0.98329 AU → 3·sqrt(0.98329) ≈ 2.9748 display units;
    // Venus aphelion 0.72824 AU → 3·sqrt(0.72824) ≈ 2.5601. The inner gap is
    // ≈ 0.4147; the outer gap (Mars perihelion 1.38140 → 3.5260 minus Earth
    // aphelion 1.01671 → 3.0250) is ≈ 0.5010. The bound is the smaller gap ×
    // the 0.75 fraction ≈ 0.311 — strictly inside the gap.
    const bound = moonOrbitMaxRadius(earthNeighborhood(), "compressed");
    expect(bound).not.toBeNull();
    expect(bound!).toBeCloseTo(0.311, 3);
    const n = earthNeighborhood();
    const innerGap = compressedDistance(n.perihelionAu) - compressedDistance(n.innerNeighborAphelionAu!);
    expect(bound!).toBeLessThan(innerGap);
    expect(bound!).toBeCloseTo(innerGap * MOON_ORBIT_MAX_GAP_FRACTION, 10);
  });

  it("is wider in true-scale mode (which must stay unclamped)", () => {
    // True-scale distances are linear (3 units/AU): the inner gap is
    // 3 × (0.98329 − 0.72824) ≈ 0.765, so the bound ≈ 0.574 — smaller than
    // the Moon's unclamped true-scale orbit (~0.661), which is exactly why
    // the scene applies the clamp in compressed mode only.
    const bound = moonOrbitMaxRadius(earthNeighborhood(), "true");
    expect(bound).not.toBeNull();
    expect(bound!).toBeCloseTo(0.75 * 3 * (0.98329 - 0.72824), 3);
    const moonTrueScale = compressedMoonOrbitRadius(6371, trueScaleRadius(6371), 0.0025695553);
    expect(moonTrueScale).toBeGreaterThan(bound!);
  });

  it("returns null when the primary has no neighbors", () => {
    const alone: MoonOrbitNeighborhood = {
      perihelionAu: 1,
      aphelionAu: 1,
      innerNeighborAphelionAu: null,
      outerNeighborPerihelionAu: null
    };
    expect(moonOrbitMaxRadius(alone, "compressed")).toBeNull();
  });

  it("returns null when a neighbor's orbit crosses the primary's", () => {
    // Pluto's perihelion (29.66 AU) dips inside Neptune's aphelion (30.08
    // AU) — a negative gap, so no orbit can be contained (Charon is
    // unclamped).
    const crossing: MoonOrbitNeighborhood = {
      perihelionAu: 29.6576,
      aphelionAu: 49.3055,
      innerNeighborAphelionAu: 30.0809,
      outerNeighborPerihelionAu: null
    };
    expect(moonOrbitMaxRadius(crossing, "compressed")).toBeNull();
  });
});

describe("ticket #20: moon orbits stay in their primary's neighborhood (compressed)", () => {
  /** A primary's neighborhood from the orbit elements, as the scene builds it. */
  function neighborhoodOf(primary: PlanetName): MoonOrbitNeighborhood {
    const idx = PLANET_NAMES.indexOf(primary);
    const inner = idx > 0 ? PLANET_ELEMENTS[PLANET_NAMES[idx - 1]] : null;
    const outer = idx < PLANET_NAMES.length - 1 ? PLANET_ELEMENTS[PLANET_NAMES[idx + 1]] : null;
    const e = PLANET_ELEMENTS[primary];
    return {
      perihelionAu: e.a0 * (1 - e.e0),
      aphelionAu: e.a0 * (1 + e.e0),
      innerNeighborAphelionAu: inner ? inner.a0 * (1 + inner.e0) : null,
      outerNeighborPerihelionAu: outer ? outer.a0 * (1 - outer.e0) : null
    };
  }

  it("keeps every moon's far point inside its primary's neighborhood", () => {
    for (const moon of MOON_NAMES) {
      const orbit = MOON_ELEMENTS[moon];
      const primary = orbit.primary;
      if (primary === "Pluto") continue; // no finite gap — Charon is unclamped
      const bound = moonOrbitMaxRadius(neighborhoodOf(primary as PlanetName), "compressed");
      expect(bound, `${moon}: no neighborhood bound`).not.toBeNull();
      const primaryKm = PLANET_VISUALS[primary as PlanetName].radiusKm;
      const display = primaryDisplayRadius(primaryKm);
      // The far point of the drawn orbit (apocenter) is what must stay inside.
      const apo = orbit.elements.a0 * (1 + orbit.elements.e0);
      const radius = compressedMoonOrbitRadius(primaryKm, display, apo, bound!);
      expect(radius, `${moon}: orbit exceeds its neighborhood bound`).toBeLessThanOrEqual(
        bound! + 1e-9
      );
      // ...and the clamp never pulls the orbit inside the primary's disc, so
      // the orbit stays followable at the default zoom.
      expect(radius, `${moon}: clamp violates the disc-clearance floor`).toBeGreaterThanOrEqual(
        display * MOON_ORBIT_MIN_RADII - 1e-9
      );
    }
  });

  it("keeps the Moon's orbit well inside Venus's orbit (the reported bug)", () => {
    const bound = moonOrbitMaxRadius(neighborhoodOf("Earth"), "compressed")!;
    // Venus's aphelion displays at ~2.5601 and Earth's perihelion at ~2.9748,
    // leaving a 0.4147-unit gap the Moon's orbit must stay far short of.
    const venusAph = compressedDistance(0.72824);
    const earthPeri = compressedDistance(0.98329);
    expect(earthPeri - venusAph).toBeCloseTo(0.4147, 3);
    expect(bound).toBeLessThan(earthPeri - venusAph);
    const earth = primaryDisplayRadius(6371);
    const moonApo = MOON_ELEMENTS.Moon.elements.a0 * (1 + MOON_ELEMENTS.Moon.elements.e0);
    const radius = compressedMoonOrbitRadius(6371, earth, moonApo, bound);
    expect(radius).toBeLessThan(earthPeri - venusAph);
    expect(radius).toBeGreaterThan(earth * MOON_ORBIT_MIN_RADII);
  });

  it("clamps the Moon, Callisto and Titan — the only moons that need it", () => {
    // Hand-computed bounds: Earth 0.311, Jupiter 1.504, Saturn 1.504.
    const cases: Array<[MoonName, number]> = [
      ["Moon", 0.311],
      ["Callisto", 1.504],
      ["Titan", 1.504]
    ];
    for (const [moon, bound] of cases) {
      const orbit = MOON_ELEMENTS[moon];
      const primary = orbit.primary as PlanetName;
      const primaryKm = PLANET_VISUALS[primary].radiusKm;
      const display = primaryDisplayRadius(primaryKm);
      const max = moonOrbitMaxRadius(neighborhoodOf(primary), "compressed")!;
      const apo = orbit.elements.a0 * (1 + orbit.elements.e0);
      const radius = compressedMoonOrbitRadius(primaryKm, display, apo, max);
      expect(max).toBeCloseTo(bound, 3);
      expect(radius).toBeCloseTo(bound, 3);
    }
  });

  it("preserves each primary's moon order under the clamp", () => {
    // The clamp is a per-orbit cap, not a family rescale: within each primary
    // the rendered far points must still follow the physical order, so no
    // moon visually overtakes a closer sibling.
    const byPrimary = new Map<PlanetName, MoonName[]>();
    for (const moon of MOON_NAMES) {
      const primary = MOON_ELEMENTS[moon].primary;
      if (primary === "Pluto") continue; // Charon's primary is a dwarf — no bound
      byPrimary.set(primary as PlanetName, [...(byPrimary.get(primary as PlanetName) ?? []), moon]);
    }
    for (const [primary, moons] of byPrimary) {
      const primaryKm = PLANET_VISUALS[primary].radiusKm;
      const display = primaryDisplayRadius(primaryKm);
      const bound = moonOrbitMaxRadius(neighborhoodOf(primary), "compressed")!;
      const physical = [...moons].sort(
        (a, b) => MOON_ELEMENTS[a].elements.a0 - MOON_ELEMENTS[b].elements.a0
      );
      const rendered = physical.map((m) => {
        const apo = MOON_ELEMENTS[m].elements.a0 * (1 + MOON_ELEMENTS[m].elements.e0);
        return compressedMoonOrbitRadius(primaryKm, display, apo, bound);
      });
      for (let i = 1; i < rendered.length; i++) {
        expect(rendered[i], `${primary} moons out of order`).toBeGreaterThan(rendered[i - 1]);
      }
    }
  });
});
