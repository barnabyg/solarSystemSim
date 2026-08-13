import { describe, expect, it } from "vitest";
import { orbitalPeriodDays, positionAt, type Vec3 } from "./kepler";
import { PLANET_ELEMENTS, type PlanetName } from "./elements";

// Independent test oracle: heliocentric ecliptic positions from JPL Horizons
// (center = Sun, frame = ecliptic J2000), fetched 2026-08-13.
//   Epoch 1: J2000.0 (JD 2451545.0, TT)
//   Epoch 2: JD 2461265.5 (2026-08-13 00:00 UT) — 9720.5 days past J2000
// Earth is modeled at the Earth/Moon barycenter, matching the JPL elements.
const DAYS_TO_2026 = 9720.5;

// Tolerance in AU, per planet. The JPL Table 1 approximate elements are a
// two-body fit with linear rates; Horizons is the full planetary ephemeris.
// Measured agreement of the elements vs Horizons at these two epochs
// (2026-08-13), in AU (J2000 / 2026):
//   Mercury 6.9e-6/1.9e-5, Venus 5.4e-5/2.1e-5, Earth 1.3e-5/4.7e-5,
//   Mars 5.5e-5/3.2e-4, Jupiter 7.7e-3/2.9e-3, Saturn 2.6e-2/1.2e-2,
//   Uranus 7.2e-3/5.7e-3, Neptune 7.4e-3/4.9e-3.
// Inner-planet error is dominated by the fit; outer-planet error by
// neglected perturbations (notably the Jupiter-Saturn resonance). Each
// tolerance is ~3x the worst measured epoch delta, rounded up — a regression
// guard for the solver, not a claim of full-ephemeris precision.
const ORACLE: Record<PlanetName, { j2000: Vec3; e2026: Vec3; tolerance: number }> = {
  Mercury: {
    j2000: { x: -0.1300936053754522, y: -0.4472876181353563, z: -0.02459830695805179 },
    e2026: { x: 0.1124178733354696, y: 0.2865715854741601, z: 0.01310916053733958 },
    tolerance: 1e-4
  },
  Venus: {
    j2000: { x: -0.718302296345389, y: -0.03265430819980606, z: 0.04101418202684621 },
    e2026: { x: 0.07490340053289661, y: -0.7232992492065538, z: -0.01425917344505438 },
    tolerance: 2e-4
  },
  Earth: {
    j2000: { x: -0.1771587841839055, y: 0.9672193524609504, z: -0.000001139275508446145 },
    e2026: { x: 0.7752449080114313, y: -0.6523837488236439, z: 0.00003456263955663247 },
    tolerance: 2e-4
  },
  Mars: {
    j2000: { x: 1.390715921746351, y: -0.01341631815101244, z: -0.03446766277581799 },
    e2026: { x: 0.7507739563801213, y: 1.292950154587467, z: 0.008686264364124983 },
    tolerance: 1e-3
  },
  Jupiter: {
    j2000: { x: 4.001177435589426, y: 2.938575782470499, z: -0.101785283451815 },
    e2026: { x: -3.199297950464107, y: 4.213534981689523, z: 0.05407686646376445 },
    tolerance: 2.5e-2
  },
  Saturn: {
    j2000: { x: 6.406410428378656, y: 6.569988452110556, z: -0.3690759730763678 },
    e2026: { x: 9.321633818475034, y: 1.498158558673873, z: -0.3971484527663202 },
    tolerance: 8e-2
  },
  Uranus: {
    j2000: { x: 14.43185527592405, y: -13.73432340215935, z: -0.2381417673271042 },
    e2026: { x: 9.10319850581099, y: 17.18825815392686, z: -0.05419873514049803 },
    tolerance: 2.5e-2
  },
  Neptune: {
    j2000: { x: 16.81204760586415, y: -24.99176325272639, z: 0.1272225117089998 },
    e2026: { x: 29.84556590477458, y: 1.225682491229343, z: -0.7130198775541224 },
    tolerance: 2.5e-2
  }
};

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe("orbital periods", () => {
  // Published sidereal periods (days), independent of the fit elements.
  const PERIOD_DAYS: Record<PlanetName, number> = {
    Mercury: 87.9691,
    Venus: 224.7008,
    Earth: 365.2564,
    Mars: 686.9799,
    Jupiter: 4332.8201,
    Saturn: 10755.7,
    Uranus: 30687.15,
    Neptune: 60190.03
  };

  for (const [name, days] of Object.entries(PERIOD_DAYS) as [PlanetName, number][]) {
    it(`gives ${name} its published orbital period`, () => {
      const computed = orbitalPeriodDays(PLANET_ELEMENTS[name].a0);
      expect(computed).toBeGreaterThan(days * 0.99);
      expect(computed).toBeLessThan(days * 1.01);
    });
  }
});

describe("positionAt", () => {
  for (const [name, expected] of Object.entries(ORACLE) as [PlanetName, (typeof ORACLE)[PlanetName]][]) {
    it(`places ${name} at its Horizons position at J2000 (t=0)`, () => {
      const actual = positionAt(PLANET_ELEMENTS[name], 0);
      expect(dist(actual, expected.j2000)).toBeLessThanOrEqual(expected.tolerance);
    });

    it(`places ${name} at its Horizons position in 2026 (t=${DAYS_TO_2026} days)`, () => {
      const actual = positionAt(PLANET_ELEMENTS[name], DAYS_TO_2026);
      expect(dist(actual, expected.e2026)).toBeLessThanOrEqual(expected.tolerance);
    });
  }
});
