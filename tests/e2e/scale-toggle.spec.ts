import { expect, test, type Page } from "@playwright/test";
import type { CameraState } from "../../src/camera/camera";

// Ticket #10 true-scale toggle: the button flips between compressed scale
// (the playable default) and true-scale mode (real distances with readable
// bodies — ADR-0002), and the camera reframes so the view stays coherent and
// bodies remain findable. UI-interaction seam (ADR-0004): the toggle state is
// observed through the button itself (label + aria-pressed) and the
// #scale-mode mirror; the "known distance relationship" acceptance criterion
// is checked through the __bodyPosition seam — Earth's 1 AU vs Neptune's
// ~30 AU shows the real ratio (~30) in true-scale mode and the compressed
// sqrt ratio (~5.5) otherwise.

declare global {
  interface Window {
    __bodyPosition?: (name: string) => { x: number; y: number; z: number } | null;
    __bodyScale?: (name: string) => number | null;
    __cameraState?: CameraState;
  }
}

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

function cameraState(page: Page): Promise<CameraState> {
  return page.evaluate(() => {
    const state = window.__cameraState;
    if (!state) throw new Error("missing __cameraState seam");
    return state;
  });
}

/**
 * The displayed Earth↔Neptune distance ratio: each body's distance from the
 * Sun (the origin) in world units, Neptune over Earth. Both positions are
 * read in one synchronous evaluate, so they come from the same frame.
 */
async function distanceRatio(page: Page): Promise<number> {
  return page.evaluate(() => {
    const earth = window.__bodyPosition?.("Earth");
    const neptune = window.__bodyPosition?.("Neptune");
    if (!earth || !neptune) throw new Error("missing __bodyPosition seam data");
    const sunDistance = (p: { x: number; y: number; z: number }) =>
      Math.hypot(p.x, p.y, p.z);
    return sunDistance(neptune) / sunDistance(earth);
  });
}

test("the toggle is present and defaults to compressed scale", async ({ page }) => {
  await boot(page);

  const toggle = page.locator("#scale-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText("Scale: Compressed");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#scale-mode")).toHaveText("compressed");

  // Compressed mode compresses the outer system: the displayed ratio is the
  // square root of the real one (~sqrt(30) ≈ 5.5), not the real ~30.
  expect(await distanceRatio(page)).toBeLessThan(7);
});

test("the toggle flips to true-scale mode and back", async ({ page }) => {
  await boot(page);

  const toggle = page.locator("#scale-toggle");
  await toggle.click();

  await expect(toggle).toHaveText("Scale: True scale");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#scale-mode")).toHaveText("true");

  // True-scale mode: the displayed ratio is the real one — Neptune is ~30×
  // farther from the Sun than Earth.
  const trueRatio = await distanceRatio(page);
  expect(trueRatio).toBeGreaterThan(25);

  await toggle.click();
  await expect(toggle).toHaveText("Scale: Compressed");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#scale-mode")).toHaveText("compressed");
  expect(await distanceRatio(page)).toBeLessThan(7);
  // Body sizes restore with the mode: the Sun is back at its compressed
  // display radius.
  expect(await page.evaluate(() => window.__bodyScale?.("Sun"))).toBeCloseTo(0.85, 3);
});

test("true-scale mode keeps distances real and bodies readable", async ({ page }) => {
  await boot(page);
  await page.locator("#scale-toggle").click();
  await expect(page.locator("#scale-mode")).toHaveText("true");

  // The real emptiness: the outer system is genuinely far out.
  const ratio = await distanceRatio(page);
  expect(ratio).toBeGreaterThan(25);
  // ...yet every body stays findable: the labels of the innermost and
  // outermost planets remain on screen after the camera reframes.
  await expect(page.locator('[data-body="Mercury"]')).toBeVisible();
  await expect(page.locator('[data-body="Neptune"]')).toBeVisible();

  // Bodies shrink from their compressed size toward real proportions — but
  // never below the readable floor, so nothing vanishes (ADR-0002).
  const sun = await page.evaluate(() => window.__bodyScale?.("Sun"));
  const jupiter = await page.evaluate(() => window.__bodyScale?.("Jupiter"));
  expect(sun).not.toBeNull();
  expect(jupiter).not.toBeNull();
  expect(sun!).toBeLessThan(0.85); // compressed Sun clamps at 0.85
  expect(sun!).toBeCloseTo(0.696, 2);
  expect(jupiter!).toBeCloseTo(0.1, 3); // the readable minimum floor

  // Artifact for the slice review sheet: the true-scale view.
  await page.screenshot({ path: "test-results/true-scale-view.png" });
});

test("the camera reframes so the true-scale system stays in view", async ({ page }) => {
  await boot(page);

  const before = await cameraState(page);
  expect(before.mode).toBe("free");

  await page.locator("#scale-toggle").click();
  await expect(page.locator("#scale-mode")).toHaveText("true");

  const after = await cameraState(page);
  expect(after.mode).toBe("free");
  // The overview zooms out by the system-scale ratio (~5.5×): the whole
  // system still fits the frame at real distances.
  expect(after.distance).toBeGreaterThan(before.distance * 4);
  expect(after.distance).toBeLessThan(300);
  // The view stays Sun-centered — the target does not jump.
  for (const v of after.target) expect(Math.abs(v)).toBeLessThan(0.01);
});

test("focus survives the toggle and follows the body out to its real distance", async ({ page }) => {
  await boot(page);

  // Focus Neptune through the canvas at its projected position (the label
  // floats above the anchor point where the body actually is), retrying
  // while the sim runs — an overlapping label can steal the click, and a
  // day per second of sim time drifts it clear.
  const neptune = page.locator('[data-body="Neptune"]');
  await expect(neptune).toBeVisible();
  for (let attempt = 0; attempt < 8; attempt++) {
    const box = (await neptune.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + 1.5 * box.height);
    if ((await page.locator("#camera-state").textContent()) === "focus:Neptune") break;
    await page.waitForTimeout(600);
  }
  await expect(page.locator("#camera-state")).toHaveText("focus:Neptune");
  // Let the focus transition settle before measuring the view.
  await page.waitForTimeout(1000);
  const before = await cameraState(page);

  await page.locator("#scale-toggle").click();
  await expect(page.locator("#scale-mode")).toHaveText("true");

  // The camera stays focused on Neptune through the flip; let the reframe
  // transition settle, then confirm the view.
  await expect(page.locator("#camera-state")).toHaveText("focus:Neptune");
  await page.waitForTimeout(1000);
  const after = await cameraState(page);
  expect(after.mode).toBe("focus");
  expect(after.focused).toBe("Neptune");

  // ...and follows it out to its real distance: Neptune jumps from its
  // compressed ~16 units to ~90, and the camera rides along (Earth is the
  // degenerate case at 1 AU, so an outer body proves the adjustment).
  const distBefore = Math.hypot(...before.position);
  const distAfter = Math.hypot(...after.position);
  expect(distAfter).toBeGreaterThan(distBefore * 1.5);
  expect(distAfter).toBeGreaterThan(60);

  // The focused body keeps projecting to the screen center — the view stays
  // coherent at the real distance.
  const vp = page.viewportSize()!;
  const box = (await neptune.boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThan(80);
  expect(Math.abs(box.y + 1.5 * box.height - vp.height / 2)).toBeLessThan(100);
});
