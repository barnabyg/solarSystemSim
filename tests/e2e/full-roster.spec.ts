import { expect, test, type Page } from "@playwright/test";
import type { CameraState } from "../../src/camera/camera";

// Ticket #8: the full roster — thirteen moons orbiting their planets, five
// dwarf planets orbiting the Sun, and the stylized asteroid belt between Mars
// and Jupiter. Every body is focusable and labeled.
//
// Rendering-smoke and UI-interaction seams (ADR-0004): body presence is the
// DOM surface of the labels plus the #roster-status counts (mirrored from the
// scene's actual construction), belt motion is observed through the
// __beltParticlePosition seam (a read of the rendered particle buffer), and
// "focusable" is exercised through the real label-click path.

/** The 27 bodies the spec promises: Sun + 8 planets + 13 moons + 5 dwarfs. */
const ALL_BODY_NAMES = [
  "Sun",
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
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
  "Charon",
  "Pluto",
  "Ceres",
  "Eris",
  "Makemake",
  "Haumea"
];

declare global {
  interface Window {
    __beltParticlePosition?: () => [number, number, number];
    __cameraState?: CameraState;
  }
}

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

test("boots with all 27 bodies labeled and the belt rendered, no console errors", async ({
  page
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await boot(page);

  // The roster seam mirrors the scene's actual construction: 27 labeled
  // bodies (Sun + 8 planets + 13 moons + 5 dwarfs) and 6000 belt particles.
  const roster = page.locator("#roster-status");
  await expect(roster).toHaveAttribute("data-bodies", "27");
  await expect(roster).toHaveAttribute("data-belt", "6000");
  await expect(roster).toContainText("27 bodies");

  // Every body has a name label — the DOM surface of body presence.
  for (const name of ALL_BODY_NAMES) {
    await expect(page.locator(`[data-body="${name}"]`)).toBeVisible();
  }
  await expect(page.locator(".body-label")).toHaveCount(ALL_BODY_NAMES.length);

  expect(errors).toEqual([]);

  // Artifact for the slice review sheet: the full roster in one view.
  await page.screenshot({ path: "test-results/full-roster.png" });
});

test("the asteroid belt rotates differentially between Mars and Jupiter", async ({ page }) => {
  await boot(page);

  // Belt particle 0's world position is read from the rendered buffer. At the
  // month-per-second preset the sim advances ~30 days per real second, so a
  // few seconds of warp move a particle a visible distance along its orbit.
  const before = await page.evaluate(() => window.__beltParticlePosition!());
  await page.locator('[data-warp-preset="2629746"]').click();
  await expect(page.locator("#warp-label")).toHaveText("1 mo/s");
  await page.waitForTimeout(2000);
  const after = await page.evaluate(() => window.__beltParticlePosition!());
  const moved = Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
  expect(moved).toBeGreaterThan(0.05);

  // Pausing freezes the belt: positions stop changing.
  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Resume");
  const frozen = await page.evaluate(() => window.__beltParticlePosition!());
  await page.waitForTimeout(1500);
  const later = await page.evaluate(() => window.__beltParticlePosition!());
  const drifted = Math.hypot(later[0] - frozen[0], later[1] - frozen[1], later[2] - frozen[2]);
  expect(drifted).toBeLessThan(0.001);
});

test("moons orbit their planets: the camera follows a focused moon", async ({ page }) => {
  await boot(page);

  // Pick a moon whose label is unambiguous right now (the overview's 27
  // labels overlap; the browser routes a click to whichever label is topmost
  // at the click point). Pause first so the hit test and the click agree
  // exactly — labels drift as the sim advances.
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
  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Resume");
  const target = await page.evaluate((candidates) => {
    const isTopmost = (name: string): boolean => {
      const el = document.querySelector<HTMLElement>(`[data-body="${name}"]`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top?.closest("[data-body]")?.getAttribute("data-body") === name;
    };
    return candidates.find(isTopmost) ?? null;
  }, MOONS);
  if (!target) throw new Error("no unambiguous moon label at this moment");
  await page.locator(`[data-body="${target}"]`).click();
  await expect(page.locator("#camera-state")).toHaveText(`focus:${target}`);

  // Resume the sim, let the focus transition settle, then confirm the camera
  // keeps moving — it must follow the moon's fast orbit at the default
  // day-per-second warp.
  await page.keyboard.press("Space");
  await expect(page.locator("#pause-btn")).toHaveText("Pause");
  await page.waitForTimeout(1200);
  const posBefore = (await page.evaluate(() => window.__cameraState!.position))!;
  await page.waitForTimeout(2000);
  const later = await page.evaluate(() => window.__cameraState!);
  const moved = Math.hypot(
    later.position[0] - posBefore[0],
    later.position[1] - posBefore[1],
    later.position[2] - posBefore[2]
  );
  expect(moved).toBeGreaterThan(0.05);
  expect(later.mode).toBe("focus");
  expect(later.focused).toBe(target);
});

test("moons and dwarf planets are focusable through their labels", async ({ page }) => {
  // At the overview zoom the 27 labels overlap (nearby bodies sit a few
  // pixels apart), and the browser routes a label click to whichever label
  // is topmost at the click point. So instead of hard-coding bodies, pick at
  // runtime one moon and one dwarf whose labels are unambiguous right now —
  // the topmost element at their own center is themselves — then click
  // those. Each category runs on a fresh page so every click happens at the
  // opening overview with no camera-transition interference.
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
  const DWARFS = ["Pluto", "Ceres", "Eris", "Makemake", "Haumea"];

  for (const category of [MOONS, DWARFS]) {
    await boot(page);
    // Freeze the labels so the hit test below and the subsequent click agree
    // exactly (the sim advances ~1 day per second, drifting labels).
    await page.keyboard.press("Space");
    await expect(page.locator("#pause-btn")).toHaveText("Resume");

    const target = await page.evaluate((candidates) => {
      const isTopmost = (name: string): boolean => {
        const el = document.querySelector<HTMLElement>(`[data-body="${name}"]`);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return top?.closest("[data-body]")?.getAttribute("data-body") === name;
      };
      return candidates.find(isTopmost) ?? null;
    }, category);
    if (!target) throw new Error("no unambiguous label in this category at this moment");

    await page.locator(`[data-body="${target}"]`).click();
    await expect(page.locator("#camera-state")).toHaveText(`focus:${target}`);
    const state = await page.evaluate(() => window.__cameraState!);
    expect(state.mode).toBe("focus");
    expect(state.focused).toBe(target);
  }

  // Releasing returns to free flight.
  await page.mouse.click(30, 30);
  await expect(page.locator("#camera-state")).toHaveText("free");
});
