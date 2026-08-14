import { expect, test, type Page } from "@playwright/test";
import type { CameraState } from "../../src/camera/camera";

// Ticket #5 camera: free flight & focus. UI-interaction and rendering-smoke
// seams (ADR-0004): drag rotates (and right-drag pans), scroll zooms, clicking
// a body focuses it and the camera follows its orbit, clicking empty space
// releases back to free flight. The opening view is Sun-centered with the
// one-line hint visible.
//
// Camera state is observed through the __cameraState seam (mode, focused,
// target, yaw, pitch, distance, position) plus the #camera-state DOM mirror;
// both are updated by main.ts every frame.

declare global {
  interface Window {
    __cameraState?: CameraState;
  }
}

function cameraState(page: Page) {
  return page.evaluate(() => {
    const state = window.__cameraState;
    if (!state) throw new Error("missing __cameraState seam");
    return state;
  });
}

test("opens Sun-centered in free flight with the hint visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  // The one-line hint is part of the opening view.
  await expect(page.locator("#hint")).toBeVisible();
  await expect(page.locator("#hint")).toContainText("Drag to look around");
  await expect(page.locator("#camera-state")).toHaveText("free");

  const state = await cameraState(page);
  expect(state.mode).toBe("free");
  expect(state.focused).toBeNull();
  // Sun-centered: the view target is the Sun at the origin, and the camera
  // sits far enough out to frame the whole system.
  for (const v of state.target) expect(Math.abs(v)).toBeLessThan(0.01);
  expect(state.distance).toBeGreaterThan(25);

  // The Sun projects to the center of the screen (its label floats above the
  // anchor point, which is where the body actually is).
  const sun = await page.locator('[data-body="Sun"]').boundingBox();
  const vp = page.viewportSize()!;
  expect(sun).not.toBeNull();
  expect(Math.abs(sun!.x + sun!.width / 2 - vp.width / 2)).toBeLessThan(60);
  expect(Math.abs(sun!.y + 1.5 * sun!.height - vp.height / 2)).toBeLessThan(80);
});

test("drag rotates and pans the camera; scroll zooms", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  const before = await cameraState(page);
  const vp = page.viewportSize()!;
  const cx = vp.width / 2;
  const cy = vp.height / 2;

  // Left-drag rotates: yaw swings, a purely horizontal drag leaves pitch alone.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 160, cy, { steps: 8 });
  await page.mouse.up();
  const afterRotate = await cameraState(page);
  expect(Math.abs(afterRotate.yaw - before.yaw)).toBeGreaterThan(0.2);
  expect(Math.abs(afterRotate.pitch - before.pitch)).toBeLessThan(0.02);

  // Right-drag pans: the view target moves in the camera's view plane.
  const targetBefore = afterRotate.target;
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx + 120, cy, { steps: 8 });
  await page.mouse.up({ button: "right" });
  const afterPan = await cameraState(page);
  const panDistance = Math.hypot(
    afterPan.target[0] - targetBefore[0],
    afterPan.target[1] - targetBefore[1],
    afterPan.target[2] - targetBefore[2]
  );
  expect(panDistance).toBeGreaterThan(0.5);
  expect(afterPan.mode).toBe("free");

  // Scroll zooms in, then out.
  const distanceBefore = afterPan.distance;
  await page.mouse.wheel(0, -240);
  const zoomedIn = await cameraState(page);
  expect(zoomedIn.distance).toBeLessThan(distanceBefore - 1);
  await page.mouse.wheel(0, 240);
  const zoomedOut = await cameraState(page);
  expect(zoomedOut.distance).toBeGreaterThan(zoomedIn.distance + 1);

  // The first interaction dismissed the hint.
  await expect(page.locator("#hint")).toBeHidden();
});

test("clicking a body focuses it and the camera follows its orbit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  // Click Earth through the canvas at its projected position (the label
  // floats above the anchor point where the body actually is).
  const earth = page.locator('[data-body="Earth"]');
  await expect(earth).toBeVisible();
  const box = (await earth.boundingBox())!;
  const anchorX = box.x + box.width / 2;
  const anchorY = box.y + 1.5 * box.height;
  await page.mouse.click(anchorX, anchorY);

  await expect(page.locator("#camera-state")).toHaveText("focus:Earth");
  const focused = await cameraState(page);
  expect(focused.mode).toBe("focus");
  expect(focused.focused).toBe("Earth");

  // Let the focus transition settle, then check the camera follows: Earth
  // keeps projecting to the screen center while the sim date advances and
  // the body moves along its orbit (so the camera itself must move).
  await page.waitForTimeout(1000);
  const posBefore = (await cameraState(page)).position;
  await page.waitForTimeout(1500);
  const later = await cameraState(page);
  const moved = Math.hypot(
    later.position[0] - posBefore[0],
    later.position[1] - posBefore[1],
    later.position[2] - posBefore[2]
  );
  expect(moved).toBeGreaterThan(0.02);
  expect(later.mode).toBe("focus");
  expect(later.focused).toBe("Earth");

  const vp = page.viewportSize()!;
  const boxLater = (await earth.boundingBox())!;
  expect(Math.abs(boxLater.x + boxLater.width / 2 - vp.width / 2)).toBeLessThan(60);
  expect(Math.abs(boxLater.y + 1.5 * boxLater.height - vp.height / 2)).toBeLessThan(80);

  // Artifact for the slice review sheet: a focused planet.
  await page.screenshot({ path: "test-results/focused-earth.png" });
});

test("clicking empty space releases focus back to free flight", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  // Focus Earth via its label (the DOM click path).
  await page.locator('[data-body="Earth"]').click();
  await expect(page.locator("#camera-state")).toHaveText("focus:Earth");

  // Let the focus transition settle: the "no jump on release" check below
  // must measure the release itself, not a still-running transition glide.
  await page.waitForTimeout(1000);
  const before = await cameraState(page);

  // Deep space: the top-left corner of the viewport, far from any body.
  await page.mouse.click(30, 30);
  await expect(page.locator("#camera-state")).toHaveText("free");

  const after = await cameraState(page);
  expect(after.mode).toBe("free");
  expect(after.focused).toBeNull();
  // The view does not jump on release — free flight resumes where focus left
  // off, so the camera keeps its place.
  const jump = Math.hypot(
    after.position[0] - before.position[0],
    after.position[1] - before.position[1],
    after.position[2] - before.position[2]
  );
  expect(jump).toBeLessThan(0.5);

  // Free flight works from there: a drag still rotates the camera.
  const yawBefore = after.yaw;
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.width / 2 - 100, vp.height / 2, { steps: 6 });
  await page.mouse.up();
  expect(Math.abs((await cameraState(page)).yaw - yawBefore)).toBeGreaterThan(0.1);
});
