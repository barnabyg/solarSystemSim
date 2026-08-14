import { expect, test, type Page } from "@playwright/test";

// Ticket #20: moon orbits must stay inside their primary's orbital
// neighborhood in compressed scale — the reported bug had the Moon's orbit
// extending past Venus's. The scene exposes the rendered orbit radius
// (apocenter, clamped to the neighborhood in compressed mode) and the
// neighborhood bound itself through the __moonOrbitRadius / __moonOrbitBound
// seams, so the acceptance criteria are asserted numerically rather than by
// pixel. True-scale mode must be untouched: no bound applies and the orbit
// keeps its unclamped radius.

declare global {
  interface Window {
    __moonOrbitRadius?: (name: string) => number | null;
    __moonOrbitBound?: (name: string) => number | null;
  }
}

/** The 13 major moons (Charon's primary Pluto has no finite gap — it is
 *  expected to have no bound). */
const MOONS = [
  "Moon",
  "Phobos",
  "Deimos",
  "Io",
  "Europa",
  "Ganymede",
  "Callisto",
  "Titan",
  "Enceladus",
  "Mimas",
  "Miranda",
  "Triton",
  "Charon"
] as const;

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

function orbitRadius(page: Page, name: string): Promise<number | null> {
  return page.evaluate((n) => window.__moonOrbitRadius?.(n) ?? null, name);
}

function orbitBound(page: Page, name: string): Promise<number | null> {
  return page.evaluate((n) => window.__moonOrbitBound?.(n) ?? null, name);
}

test("compressed scale: every moon's orbit stays inside its primary's neighborhood", async ({
  page
}) => {
  await boot(page);
  await expect(page.locator("#scale-mode")).toHaveText("compressed");

  for (const moon of MOONS) {
    const bound = await orbitBound(page, moon);
    if (bound === null) continue; // Charon: Pluto's orbit crosses Neptune's, no gap
    const radius = await orbitRadius(page, moon);
    expect(radius, `${moon}: missing orbit radius`).not.toBeNull();
    expect(radius!, `${moon}: orbit exceeds its neighborhood bound`).toBeLessThanOrEqual(bound);
  }
});

test("compressed scale: the Moon's orbit stays well inside Venus's orbit (the reported bug)", async ({
  page
}) => {
  await boot(page);

  // The Moon's orbit is clamped to ~0.31 display units — far short of the
  // ~0.41 gap between Earth's perihelion (2.975) and Venus's aphelion
  // (2.560), so it can never cross Venus's orbit — yet stays clear of
  // Earth's disc (0.16), so it remains visible at the default zoom.
  const radius = await orbitRadius(page, "Moon");
  const bound = await orbitBound(page, "Moon");
  expect(radius).not.toBeNull();
  expect(bound).not.toBeNull();
  expect(bound!).toBeLessThan(0.42);
  expect(radius!).toBeLessThan(0.4);
  expect(radius!).toBeGreaterThan(0.25);
});

test("true-scale mode leaves moon orbits exactly as they were", async ({ page }) => {
  await boot(page);
  await page.locator("#scale-toggle").click();
  await expect(page.locator("#scale-mode")).toHaveText("true");

  // No neighborhood bound applies in true-scale mode…
  expect(await orbitBound(page, "Moon")).toBeNull();
  // …and the Moon's orbit keeps its unclamped radius — the hand-computed
  // true-scale value (Earth's 0.1-unit disc × 6.61 ≈ 0.66) — proving the
  // clamp is off and true-scale rendering is unchanged.
  expect(await orbitRadius(page, "Moon")).toBeCloseTo(0.661, 2);
});
