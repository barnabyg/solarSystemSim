import { expect, test, type Page } from "@playwright/test";

// Ticket #6 time controls: the bottom-center control bar (pause, warp
// slider, presets), the corner sim-date readout, keyboard shortcuts
// (Space / ← / → / + / -), and the tab-blur pause. UI-interaction seam
// (ADR-0004): the user-facing promises are exercised through the real DOM —
// the clock state is observed through the controls themselves (pause label,
// warp label, readout), never through internals.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

function readDate(page: Page): Promise<string | null> {
  return page.locator("#sim-date").textContent();
}

function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

test("shows the control bar, presets, and corner readout", async ({ page }) => {
  await boot(page);

  await expect(page.locator("#time-controls")).toBeVisible();
  await expect(page.locator("#pause-btn")).toBeVisible();
  await expect(page.locator("#pause-btn")).toHaveText("Pause");
  await expect(page.locator("#warp-slider")).toBeVisible();
  await expect(page.locator('[data-warp-preset="1"]')).toHaveText("1×");
  await expect(page.locator('[data-warp-preset="3600"]')).toHaveText("1 h/s");
  await expect(page.locator('[data-warp-preset="86400"]')).toHaveText("1 d/s");
  await expect(page.locator('[data-warp-preset="2629746"]')).toHaveText("1 mo/s");

  // Default warp is one sim-day per real second.
  await expect(page.locator("#warp-label")).toHaveText("1 d/s");

  // The corner readout shows the sim date (today) and advances with warp.
  await expect(page.locator("#sim-date")).toBeVisible();
  await expect(page.locator("#sim-date")).not.toHaveText("");

  // Artifact for the slice review sheet: the time-controls bar.
  await page.screenshot({ path: "test-results/time-controls.png" });
});

test("presets change the time warp and the readout reflects it", async ({ page }) => {
  await boot(page);

  // At real time the calendar readout does not advance within the test
  // window — the baseline the day/s check below is measured against.
  await page.locator('[data-warp-preset="1"]').click();
  await expect(page.locator("#warp-label")).toHaveText("1×");
  const realStart = await readDate(page);
  await page.waitForTimeout(1500);
  expect(await readDate(page)).toBe(realStart);

  // Acceptance criterion: warp to day/s and verify the readout advances.
  await page.locator('[data-warp-preset="86400"]').click();
  await expect(page.locator("#warp-label")).toHaveText("1 d/s");
  const dayStart = await readDate(page);
  await page.waitForTimeout(2500);
  const dayLater = await readDate(page);
  expect(dayLater).not.toBe(dayStart);

  // Warping up to a month per second advances many days per real second.
  await page.locator('[data-warp-preset="2629746"]').click();
  await expect(page.locator("#warp-label")).toHaveText("1 mo/s");
  const monthStart = await readDate(page);
  await page.waitForTimeout(1500);
  const monthLater = await readDate(page);
  const daysAdvanced =
    (Date.parse(`${monthLater}T00:00:00Z`) - Date.parse(`${monthStart}T00:00:00Z`)) / 86400000;
  expect(daysAdvanced).toBeGreaterThanOrEqual(20);
});

test("pause freezes the readout; resume continues it", async ({ page }) => {
  await boot(page);

  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-btn")).toHaveText("Resume");
  await expect(page.locator("#pause-btn")).toHaveAttribute("aria-pressed", "true");

  const frozen = await readDate(page);
  await page.waitForTimeout(2000);
  expect(await readDate(page)).toBe(frozen);

  await page.locator("#pause-btn").click();
  await expect(page.locator("#pause-btn")).toHaveText("Pause");
  const resumed = await readDate(page);
  await page.waitForTimeout(2000);
  expect(await readDate(page)).not.toBe(resumed);
});

test("the warp slider adjusts the time warp continuously", async ({ page }) => {
  await boot(page);

  const slider = page.locator("#warp-slider");
  const setSlider = (position: number) =>
    slider.evaluate((el, value) => {
      (el as HTMLInputElement).value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, position);

  // Far left is real time; far right is one month per second; the middle of
  // the log range sits near one hour per second.
  await setSlider(0);
  await expect(page.locator("#warp-label")).toHaveText("1×");
  await setSlider(1000);
  await expect(page.locator("#warp-label")).toHaveText("1 mo/s");
  await setSlider(554);
  await expect(page.locator("#warp-label")).toHaveText("1.0 h/s");
});

test("Space toggles pause", async ({ page }) => {
  await boot(page);

  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Resume");
  const frozen = await readDate(page);
  await page.waitForTimeout(2000);
  expect(await readDate(page)).toBe(frozen);

  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Pause");
});

test("Space still pauses after clicking a control", async ({ page }) => {
  await boot(page);

  // Focus lands on the preset button; Space must pause the sim rather than
  // re-fire the button's click.
  await page.locator('[data-warp-preset="86400"]').click();
  await expect(page.locator("#warp-label")).toHaveText("1 d/s");
  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Resume");
  const frozen = await readDate(page);
  await page.waitForTimeout(1500);
  expect(await readDate(page)).toBe(frozen);
});

test("arrow keys step the sim date a day at a time", async ({ page }) => {
  await boot(page);

  // Click a control first: focus sits on the button, and arrows must still
  // step the date.
  await page.locator('[data-warp-preset="86400"]').click();
  await expect(page.locator("#warp-label")).toHaveText("1 d/s");

  // Pause first so continuous ticking cannot blur the exact stepped date.
  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Resume");

  const start = (await readDate(page))!;
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => readDate(page)).toBe(addDays(start, 1));
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => readDate(page)).toBe(addDays(start, 2));
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => readDate(page)).toBe(addDays(start, 1));
});

test("plus and minus double and halve the warp", async ({ page }) => {
  await boot(page);

  // Default warp is one day per second.
  await expect(page.locator("#warp-label")).toHaveText("1 d/s");
  await page.keyboard.press("+");
  await expect(page.locator("#warp-label")).toHaveText("2 d/s");
  await page.keyboard.press("+");
  await expect(page.locator("#warp-label")).toHaveText("4 d/s");
  await page.keyboard.press("-");
  await expect(page.locator("#warp-label")).toHaveText("2 d/s");
  await page.keyboard.press("-");
  await expect(page.locator("#warp-label")).toHaveText("1 d/s");
});

test("losing focus pauses the sim", async ({ page }) => {
  await boot(page);

  // Tab blur (spec user story #40): the sim pauses and must be resumed
  // manually.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#pause-btn")).toHaveText("Resume");
  const frozen = await readDate(page);
  await page.waitForTimeout(2000);
  expect(await readDate(page)).toBe(frozen);

  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Pause");
  const resumed = await readDate(page);
  await page.waitForTimeout(2000);
  expect(await readDate(page)).not.toBe(resumed);
});
