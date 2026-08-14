import { expect, test, type Page } from "@playwright/test";
import { clickAway, focusViaCanvas } from "./overlap-helpers";

// Ticket #9 fact cards: inspecting a body (clicking it in the scene, or its
// label) opens the card on the right showing the six fact fields, the "vs
// Earth" size bar, and one fun fact — straight from the catalog. It closes on
// Escape, on its close button, or by clicking away (empty space in the scene
// releases focus). UI-interaction seam (ADR-0004): the user-facing promises
// are exercised through the real DOM.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

/**
 * Inspect a body through the canvas — the overlap-proof path (see
 * overlap-helpers.ts): a raw label click can be intercepted by a covering
 * label at the overview zoom, which is date-dependent and flaky. The shared
 * helper retries while the sim runs, so a passing moon (its orbit clamped to
 * ~2× Earth's display radius, ticket #20) or its label moving over the click
 * point resolves itself between attempts.
 */
async function inspect(page: Page, name: string): Promise<void> {
  await focusViaCanvas(page, name);
}

test("clicking Earth opens its fact card with all six fields", async ({ page }) => {
  await boot(page);
  await inspect(page, "Earth");

  const card = page.locator("#fact-card");
  await expect(card).toBeVisible();
  await expect(page.locator("#fact-card-name")).toHaveText("Earth");
  await expect(page.locator('#fact-card [data-fact="diameter"]')).toHaveText("12,742 km");
  await expect(page.locator('#fact-card [data-fact="distance"]')).toHaveText("1 AU");
  await expect(page.locator('#fact-card [data-fact="day"]')).toHaveText("23.9 h");
  await expect(page.locator('#fact-card [data-fact="period"]')).toHaveText("365.3 days");
  await expect(page.locator('#fact-card [data-fact="temperature"]')).toHaveText("288 K");
  await expect(page.locator('#fact-card [data-fact="moons"]')).toHaveText("1 moon");

  // The vs-Earth size bar and the fun fact are part of the card.
  await expect(page.locator("#fact-vs-label")).toHaveText("1× Earth");
  await expect(page.locator("#fact-fun-fact")).toContainText("liquid water");

  // Artifact for the slice review sheet: a fact card.
  await page.screenshot({ path: "test-results/fact-card-earth.png" });
});

test("Escape closes the card", async ({ page }) => {
  await boot(page);
  await inspect(page, "Earth");
  await expect(page.locator("#fact-card")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#fact-card")).toBeHidden();

  // Inspecting again reopens the card.
  await inspect(page, "Earth");
  await expect(page.locator("#fact-card")).toBeVisible();
});

test("the close button closes the card", async ({ page }) => {
  await boot(page);
  // Inspect through the canvas (overlap-proof): a raw label click can be
  // intercepted by a covering label at the overview zoom, which is date-
  // dependent and flaky.
  await inspect(page, "Earth");
  await expect(page.locator("#fact-card")).toBeVisible();

  await page.locator("#fact-card-close").click();
  await expect(page.locator("#fact-card")).toBeHidden();
});

test("clicking away closes the card and releases focus", async ({ page }) => {
  await boot(page);
  await inspect(page, "Earth");
  await expect(page.locator("#fact-card")).toBeVisible();

  // Click away on provably empty canvas: the click releases the camera focus
  // and the card closes with it.
  await clickAway(page);
  await expect(page.locator("#fact-card")).toBeHidden();
  await expect(page.locator("#camera-state")).toHaveText("free");
});

test("inspecting another body switches the card", async ({ page }) => {
  await boot(page);
  await inspect(page, "Earth");
  await expect(page.locator("#fact-card-name")).toHaveText("Earth");

  await inspect(page, "Mars");
  await expect(page.locator("#fact-card-name")).toHaveText("Mars");
  await expect(page.locator('#fact-card [data-fact="diameter"]')).toHaveText("6,779 km");
  await expect(page.locator("#fact-vs-label")).toHaveText("0.532× Earth");
});

test("the Sun opens a fact card too", async ({ page }) => {
  await boot(page);
  // Same overlap-proof inspection as the planets (labels overlap at the
  // overview zoom; the canvas path targets the body's anchor point).
  await inspect(page, "Sun");
  await expect(page.locator("#fact-card-name")).toHaveText("Sun");
  await expect(page.locator('#fact-card [data-fact="diameter"]')).toHaveText("1,392,680 km");
  await expect(page.locator("#fact-vs-label")).toHaveText("109× Earth");
  await expect(page.locator("#fact-fun-fact")).toContainText("99.86%");

  // The Sun is the frame origin: distance and orbital period do not apply.
  await expect(page.locator('#fact-card [data-fact="distance"]')).toHaveText("—");
  await expect(page.locator('#fact-card [data-fact="period"]')).toHaveText("—");
});
