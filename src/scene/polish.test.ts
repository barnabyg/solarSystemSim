import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { PLANET_VISUALS } from "../body/catalog";
import { ringColorAt } from "./polish";

// Ticket #11: the ring band lookup is the pure data seam behind Saturn's
// rendered rings — the same bands the shader bakes into its texture. Testing
// it pins the visual promise (bands colored, the Cassini division a real
// gap) at the data seam (ADR-0004).

const SATURN_RINGS = PLANET_VISUALS.Saturn.rings!.bands;

describe("ring band lookup (ticket #11)", () => {
  it("returns the B ring's bright color inside the B ring", () => {
    // B ring spans 1.53-1.95 Saturn radii; the sample at 1.7 is solidly inside.
    const sample = ringColorAt(SATURN_RINGS, 1.7);
    expect(sample).not.toBeNull();
    expect(sample!.a).toBeGreaterThan(0.9);
  });

  it("returns transparent in the Cassini division", () => {
    // The division spans 1.95-2.03 Rs and is modeled as opacity 0.
    const sample = ringColorAt(SATURN_RINGS, 1.99);
    expect(sample).not.toBeNull();
    expect(sample!.a).toBe(0);
  });

  it("returns null outside the ring system", () => {
    expect(ringColorAt(SATURN_RINGS, 0.5)).toBeNull();
    expect(ringColorAt(SATURN_RINGS, 3)).toBeNull();
  });

  it("matches the A ring's color and opacity inside the A ring", () => {
    const sample = ringColorAt(SATURN_RINGS, 2.15);
    expect(sample).not.toBeNull();
    expect(sample!.a).toBeGreaterThan(0.8);
    const band = SATURN_RINGS.find((b) => b.inner === 2.03)!;
    // Color.setHex converts sRGB → linear working space, so compare against
    // the linearized component, not the raw byte.
    const expected = new THREE.Color(band.color);
    expect(sample!.r).toBeCloseTo(expected.r, 2);
    expect(sample!.g).toBeCloseTo(expected.g, 2);
    expect(sample!.b).toBeCloseTo(expected.b, 2);
  });
});
