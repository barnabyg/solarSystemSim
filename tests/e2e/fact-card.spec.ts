import { expect, test, type Page } from "@playwright/test";

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

/** Click the body through the canvas at its projected position (the label
 *  floats above the anchor point where the body actually is). */
async function clickBody(page: Page, name: string): Promise<void> {
  const label = page.locator(`[data-body="${name}"]`);
  await expect(label).toBeVisible();
  const box = (await label.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + 1.5 * box.height);
}

/**
 * Inspect a body through the canvas, retrying while the sim runs: at the
 * overview zoom the Moon's small disc can pass exactly over Earth's click
 * point (it orbits ~6 display radii out, so a transit lasts moments), and a
 * passing moon's label can cover the anchor point too. Between attempts the
 * sim advances ~1 day per second, so the obstruction moves on and the next
 * attempt hits the intended body. The budget is generous: under the suite's
 * parallel load the software-GL host drops to ~20 fps, stretching each
 * attempt's wall-clock cost, and a transit obstruction can linger for
 * several sim days of retries.
 */
async function inspect(page: Page, name: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await clickBody(page, name);
    const state = await page.locator("#camera-state").textContent();
    if (state === `focus:${name}`) return;
    await page.waitForTimeout(800);
  }
  throw new Error(`could not focus ${name} through the canvas after retries`);
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
  await page.locator('[data-body="Earth"]').click();
  await expect(page.locator("#fact-card")).toBeVisible();

  await page.locator("#fact-card-close").click();
  await expect(page.locator("#fact-card")).toBeHidden();
});

test("clicking away closes the card and releases focus", async ({ page }) => {
  await boot(page);
  await page.locator('[data-body="Earth"]').click();
  await expect(page.locator("#fact-card")).toBeVisible();

  // Deep space: far from any body. The click releases the camera focus and
  // the card closes with it.
  await page.mouse.click(30, 30);
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
  await page.locator('[data-body="Sun"]').click();
  await expect(page.locator("#fact-card-name")).toHaveText("Sun");
  await expect(page.locator('#fact-card [data-fact="diameter"]')).toHaveText("1,392,680 km");
  await expect(page.locator("#fact-vs-label")).toHaveText("109× Earth");
  await expect(page.locator("#fact-fun-fact")).toContainText("99.86%");

  // The Sun is the frame origin: distance and orbital period do not apply.
  await expect(page.locator('#fact-card [data-fact="distance"]')).toHaveText("—");
  await expect(page.locator('#fact-card [data-fact="period"]')).toHaveText("—");
});
