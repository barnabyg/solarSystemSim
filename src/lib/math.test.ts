import { describe, expect, it } from "vitest";
import { clamp } from "./math";

describe("clamp", () => {
  it("clamps values above the range to max", () => {
    expect(clamp(10, 0, 5)).toBe(5);
  });

  it("clamps values below the range to min", () => {
    expect(clamp(-3, 0, 5)).toBe(0);
  });

  it("passes values inside the range through unchanged", () => {
    expect(clamp(2, 0, 5)).toBe(2);
  });

  it("handles an inverted range by returning min", () => {
    expect(clamp(1, 5, 0)).toBe(5);
  });
});
