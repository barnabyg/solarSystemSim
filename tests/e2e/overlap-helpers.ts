import { expect, type Page } from "@playwright/test";

// Shared overlap-proof clicking helpers (ticket #21).
//
// At the overview zoom the 27 body labels overlap: nearby bodies sit a few
// pixels apart, and the browser routes a label click to whichever label is
// topmost at the click point — so a raw label click can be intercepted by a
// covering label (e.g. the Moon's label sitting on Earth's label center, a
// layout that shifts day by day as the sim starts at today's real date).
// These helpers make the user-facing interactions deterministic instead:
// focusViaCanvas clicks the body's anchor point on the canvas (the label
// floats above it), retrying while the sim runs so a passing moon or label
// obstruction moves on; clickAway releases focus at a viewport corner that is
// provably empty canvas.

/**
 * Click a body through the canvas at its projected position (the label floats
 * above the anchor point where the body actually is).
 */
export async function clickBodyAnchor(page: Page, name: string): Promise<void> {
  const label = page.locator(`[data-body="${name}"]`);
  await expect(label).toBeVisible();
  const box = (await label.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + 1.5 * box.height);
}

/**
 * Focus a body through the canvas, retrying while the sim runs: at the
 * overview zoom a passing moon's small disc can cross the click point, and a
 * passing moon's label can cover the anchor point too (the Moon's orbit is
 * clamped to ~2× Earth's display radius, ticket #20, so its label sits over
 * Earth's label at the overview). Between attempts the sim advances ~1 day
 * per second, so the obstruction moves on and the next attempt hits the
 * intended body. The budget is generous: under the suite's parallel load the
 * software-GL host drops to ~20 fps, stretching each attempt's wall-clock
 * cost, and a transit obstruction can linger for several sim days of retries.
 */
export async function focusViaCanvas(page: Page, name: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await clickBodyAnchor(page, name);
    const state = await page.locator("#camera-state").textContent();
    if (state === `focus:${name}`) return;
    await page.waitForTimeout(800);
  }
  throw new Error(`could not focus ${name} through the canvas after retries`);
}

/**
 * Click empty canvas to release focus, deterministically. The release needs a
 * point that is (a) topmost a CANVAS element — the browser routes a scene
 * click to whatever DOM element is on top, and body labels overlap at the
 * overview zoom — and (b) not on any body mesh, or the click refocuses that
 * body instead (e.g. the Sun's disc fills the overview center, so center
 * points raycast into it). Viewport corners satisfy both, so the helper
 * verifies each corner is canvas-topmost, clicks it, and confirms the release
 * landed, falling through the corners until one does.
 */
export async function clickAway(page: Page): Promise<void> {
  const corners = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const candidates: Array<[number, number]> = [
      [30, 30],
      [30, h - 30],
      [w - 30, h - 30],
      [w - 30, 30]
    ];
    return candidates.filter(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el && el.tagName === "CANVAS";
    });
  });
  for (const [x, y] of corners) {
    await page.mouse.click(x, y);
    try {
      await expect(page.locator("#camera-state")).toHaveText("free", { timeout: 2000 });
      return;
    } catch {
      // This corner refocused a body (or the mirror lagged a frame past the
      // budget); try the next.
    }
  }
  throw new Error("clicking away at no empty corner released focus");
}
