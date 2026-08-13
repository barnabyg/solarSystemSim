import { describe, expect, it } from "vitest";
import { PLANET_VISUALS, SUN } from "./catalog";
import { PLANET_NAMES, type PlanetName } from "../orbit/elements";

// Published equatorial radii [km] from the JPL Planetary Fact Sheets
// (https://nssdc.gsfc.nasa.gov/planetary/factsheet/) — an independent source
// from the catalog's own values.
const PUBLISHED_RADII_KM: Record<PlanetName | "Sun", number> = {
  Mercury: 2439.7,
  Venus: 6051.8,
  Earth: 6371.0,
  Mars: 3389.5,
  Jupiter: 69911.0,
  Saturn: 58232.0,
  Uranus: 25362.0,
  Neptune: 24622.0,
  Sun: 696340.0
};

describe("planet catalog", () => {
  it("covers exactly the eight planets in the orbit module", () => {
    expect(Object.keys(PLANET_VISUALS).sort()).toEqual([...PLANET_NAMES].sort());
  });

  it("gives every planet a renderable color", () => {
    for (const visual of Object.values(PLANET_VISUALS)) {
      expect(Number.isInteger(visual.color)).toBe(true);
      expect(visual.color).toBeGreaterThanOrEqual(0);
      expect(visual.color).toBeLessThanOrEqual(0xffffff);
    }
  });

  for (const [name, published] of Object.entries(PUBLISHED_RADII_KM) as [PlanetName | "Sun", number][]) {
    it(`records ${name}'s radius within 0.5% of the published value`, () => {
      const radiusKm = name === "Sun" ? SUN.radiusKm : PLANET_VISUALS[name].radiusKm;
      expect(Math.abs(radiusKm - published) / published).toBeLessThanOrEqual(0.005);
    });
  }
});
