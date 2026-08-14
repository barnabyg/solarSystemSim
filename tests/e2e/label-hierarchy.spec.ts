import { expect, test, type Page } from "@playwright/test";

// Ticket #21: planet and moon labels shared one font size, so label text
// overlapped and obscured other labels/bodies at the overview zoom (user
// review feedback). The fix is a size hierarchy by body kind — the Sun and
// planets lead the eye, moons recede — applied consistently to every body.
//
// UI-interaction seam (ADR-0004): the label kind is a rendered-DOM fact, so
// the hierarchy is asserted end-to-end: each body label carries a data-kind
// attribute (sun | planet | moon | dwarf) set by the scene's label builder,
// and the stylesheet gives each kind one font size. This test asserts the
// acceptance criteria directly: every one of the eight planet labels is
// strictly larger than every one of the thirteen moon labels, and the size is
// uniform within each kind.

/** The eight planets, canonical names as in src/orbit/elements.ts. */
const PLANETS = [
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune"
];

/** The thirteen moons, canonical names as in src/orbit/elements.ts. */
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
];

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

/** The computed font size [px] of a body's label, from the rendered DOM. */
async function labelFontSize(page: Page, name: string): Promise<number> {
  return page.evaluate((bodyName) => {
    const el = document.querySelector<HTMLElement>(`[data-body="${bodyName}"]`);
    if (!el) throw new Error(`missing label for ${bodyName}`);
    return parseFloat(getComputedStyle(el).fontSize);
  }, name);
}

test("every planet label is larger than every moon label", async ({ page }) => {
  await boot(page);

  // The kind markers cover the whole roster: 8 planets, 13 moons (the scene
  // assigns data-kind from the same loops that build the bodies).
  await expect(page.locator('[data-kind="planet"]')).toHaveCount(8);
  await expect(page.locator('[data-kind="moon"]')).toHaveCount(13);

  // Each planet's label carries its kind marker and has a computed size.
  const planetSizes = await Promise.all(
    PLANETS.map(async (name) => {
      await expect(page.locator(`[data-body="${name}"]`)).toHaveAttribute("data-kind", "planet");
      return labelFontSize(page, name);
    })
  );
  const moonSizes = await Promise.all(
    MOONS.map(async (name) => {
      await expect(page.locator(`[data-body="${name}"]`)).toHaveAttribute("data-kind", "moon");
      return labelFontSize(page, name);
    })
  );

  // Acceptance criterion 1: planets are strictly larger than moons — the
  // smallest planet still beats the largest moon.
  expect(Math.min(...planetSizes)).toBeGreaterThan(Math.max(...moonSizes));

  // Acceptance criterion 3: the hierarchy is consistent — one size per kind
  // across all eight planets and all thirteen moons.
  expect(new Set(planetSizes).size).toBe(1);
  expect(new Set(moonSizes).size).toBe(1);
  expect(planetSizes[0]).toBeGreaterThan(0);
  expect(moonSizes[0]).toBeGreaterThan(0);
});
