import { expect, test, type Page } from "@playwright/test";
import type { CameraState } from "../../src/camera/camera";

// Ticket #13: rendering smoke & visual regression — the final testing seam
// (ADR-0004, seam 4). A Playwright suite that boots the app headless on a
// pinned sim date (?simDate=2000-01-01, see main.ts) and asserts the scene is
// healthy — all 27 bodies present, camera responds, no console errors — plus a
// small set of golden screenshot diffs on the three key views: the opening
// overview, a focused planet, and the true-scale view.
//
// The goldens are validated without human eyes:
//  - Playwright diffs each capture against its committed baseline
//    (maxDiffPixelRatio 0.001 ≈ 0.1% of the frame), so meaningful visual
//    changes fail the test. Body presence itself is asserted structurally
//    here and in full-roster.spec.ts, not by pixels.
//  - Each capture must be non-blank: a floor on distinct colors and luminance
//    variance rejects a broken frame (black screen, dead bloom) from ever
//    being blessed as a baseline.
//  - The three views must differ pairwise by more than a floor, proving each
//    golden captured a genuinely different view rather than a copy of one.
//
// Determinism: the pinned date fixes every body's Keplerian position, the
// procedural scene (belt, starfield, nebula) is built from fixed-seed PRNGs
// (src/lib/random.ts), and the goldens boot with ?paused=1 so the clock is
// frozen from frame one — the scene is the exact pinned-date layout with no
// elapsed sim time, byte-stable no matter how long the page takes to boot
// under test load. Each view is captured with the camera settled.

/** The pinned sim date for the goldens (the main.ts ?simDate seam). */
const PINNED_DATE = "2000-01-01";
/** The goldens boot paused (?paused=1) for byte-stable captures. */
const GOLDEN_URL = `/?simDate=${PINNED_DATE}&paused=1`;
/** The smoke test boots normally (clock running) on the pinned date. */
const SMOKE_URL = `/?simDate=${PINNED_DATE}`;
const GOLDEN_OVERVIEW = "opening-overview.png";
const GOLDEN_FOCUSED = "focused-planet.png";
const GOLDEN_TRUE_SCALE = "true-scale-view.png";
/** The eight planets — the candidates for "a focused planet". */
const PLANETS = [
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune"
] as const;

declare global {
  interface Window {
    __cameraState?: CameraState;
  }
}

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

/** Let a camera transition / reframe settle before capturing. */
async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(1200);
}

/**
 * The first planet whose label is topmost at its own center — the only click
 * target that is unambiguous right now. At the overview zoom the 27 labels
 * overlap (nearby bodies sit a few pixels apart), and the browser routes a
 * label click to whichever label is topmost at the click point. With the sim
 * paused the layout is fixed, so this pick is deterministic for the pinned
 * date.
 */
async function topmostLabel(page: Page, candidates: readonly string[]): Promise<string> {
  const target = await page.evaluate((names) => {
    const isTopmost = (name: string): boolean => {
      const el = document.querySelector<HTMLElement>(`[data-body="${name}"]`);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top?.closest("[data-body]")?.getAttribute("data-body") === name;
    };
    return names.find(isTopmost) ?? null;
  }, [...candidates]);
  if (!target) throw new Error("no unambiguous planet label at the pinned date");
  return target;
}

/** A point near the screen center that is provably empty canvas. */
async function clearCanvasPoint(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const candidates: Array<[number, number]> = [
      [cx, cy],
      [cx, cy + 40],
      [cx + 70, cy + 30],
      [cx - 70, cy + 30],
      [cx, cy + 80],
      [cx, cy - 60]
    ];
    for (const [x, y] of candidates) {
      const el = document.elementFromPoint(x, y);
      if (el && el.tagName === "CANVAS") return { x, y };
    }
    return { x: cx, y: cy + 80 };
  });
}

interface ShotStats {
  distinctColors: number;
  luminanceVariance: number;
}

/**
 * Decode a screenshot buffer to RGBA pixels, evaluated in the page (a canvas
 * decode — no image library needed). Shared by the stats and diff helpers.
 */
async function decodePng(page: Page, buffer: Buffer): Promise<Uint8ClampedArray> {
  const src = `data:image/png;base64,${buffer.toString("base64")}`;
  return page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height).data;
  }, src);
}

/**
 * Count distinct colors and the luminance variance of a screenshot buffer.
 * A blank or broken frame has almost no color diversity and near-zero
 * variance.
 */
async function shotStats(page: Page, buffer: Buffer): Promise<ShotStats> {
  const data = await decodePng(page, buffer);
  const colors = new Set<number>();
  let sum = 0;
  let sumSq = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
  }
  const mean = sum / n;
  return { distinctColors: colors.size, luminanceVariance: sumSq / n - mean * mean };
}

/** Fraction of pixels that differ visibly between two screenshots. */
async function pixelDiffRatio(page: Page, a: Buffer, b: Buffer): Promise<number> {
  const [da, db] = await Promise.all([decodePng(page, a), decodePng(page, b)]);
  let changed = 0;
  for (let i = 0; i < da.length; i += 4) {
    const delta =
      Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
    if (delta > 24) changed++;
  }
  return changed / (da.length / 4);
}

/**
 * Assert the golden for the current view and guard the frame against being
 * blank or broken.
 */
async function assertGolden(page: Page, name: string): Promise<void> {
  await expect(page).toHaveScreenshot(name, { maxDiffPixelRatio: 0.001 });
  const shot = await page.screenshot();
  const stats = await shotStats(page, shot);
  expect(stats.distinctColors, `${name}: frame must not be blank`).toBeGreaterThan(2000);
  expect(stats.luminanceVariance, `${name}: frame must not be flat`).toBeGreaterThan(100);
}

test("smoke: boots headless with all 27 bodies, a responding camera, and no console errors", async ({
  page
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await boot(page, SMOKE_URL);

  // All 27 bodies present (the roster seam mirrors the scene's construction).
  const roster = page.locator("#roster-status");
  await expect(roster).toHaveAttribute("data-bodies", "27");
  await expect(roster).toHaveAttribute("data-belt", "6000");
  await expect(page.locator(".body-label")).toHaveCount(27);

  // The camera responds: the rig is live and a drag swings yaw.
  const before = await page.evaluate(() => window.__cameraState!);
  expect(before.mode).toBe("free");
  const start = await clearCanvasPoint(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 120, start.y, { steps: 6 });
  await page.mouse.up();
  const after = await page.evaluate(() => window.__cameraState!);
  expect(Math.abs(after.yaw - before.yaw)).toBeGreaterThan(0.2);

  expect(errors).toEqual([]);
});

test("golden: the opening overview", async ({ page }) => {
  await boot(page, GOLDEN_URL);
  await settle(page);
  await assertGolden(page, GOLDEN_OVERVIEW);
});

test("golden: a focused planet", async ({ page }) => {
  await boot(page, GOLDEN_URL);

  // Pick a planet whose label is topmost at its own center at the pinned
  // date, then focus it through the real label-click path. The fact card
  // opens — it is part of this view.
  const target = await topmostLabel(page, PLANETS);
  await page.locator(`[data-body="${target}"]`).click();
  await expect(page.locator("#camera-state")).toHaveText(`focus:${target}`);
  await expect(page.locator("#fact-card")).toBeVisible();

  await settle(page); // the 0.7 s focus transition
  await assertGolden(page, GOLDEN_FOCUSED);
});

test("golden: the true-scale view", async ({ page }) => {
  await boot(page, GOLDEN_URL);
  await page.locator("#scale-toggle").click();
  await expect(page.locator("#scale-mode")).toHaveText("true");
  await settle(page); // the overview reframe (free-flight distance scales in one frame)
  await assertGolden(page, GOLDEN_TRUE_SCALE);
});

test("the three key views are genuinely different views", async ({ page }) => {
  await boot(page, GOLDEN_URL);

  // Re-derive the three golden states in one page (same deterministic picks
  // as the golden tests) and diff them pairwise: each view must differ from
  // the others by more than a floor, proving the goldens captured three
  // genuinely different views rather than copies of one.
  await settle(page);
  const overview = await page.screenshot();

  await page.locator("#scale-toggle").click();
  await expect(page.locator("#scale-mode")).toHaveText("true");
  await settle(page);
  const trueScale = await page.screenshot();
  await page.locator("#scale-toggle").click();
  await expect(page.locator("#scale-mode")).toHaveText("compressed");

  const target = await topmostLabel(page, PLANETS);
  await page.locator(`[data-body="${target}"]`).click();
  await expect(page.locator("#camera-state")).toHaveText(`focus:${target}`);
  await settle(page);
  const focused = await page.screenshot();

  const pairs: Array<[string, Buffer, Buffer]> = [
    ["overview vs focused planet", overview, focused],
    ["overview vs true-scale", overview, trueScale],
    ["focused planet vs true-scale", focused, trueScale]
  ];
  for (const [label, a, b] of pairs) {
    const ratio = await pixelDiffRatio(page, a, b);
    expect(ratio, `${label}: ${(ratio * 100).toFixed(2)}% of pixels differ`).toBeGreaterThan(0.02);
  }
});
