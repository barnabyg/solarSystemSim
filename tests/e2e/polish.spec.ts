import { expect, test, type Page } from "@playwright/test";

// Ticket #11 visual polish: bloom + tone mapping, atmosphere shells, Saturn's
// rings with gaps, the Sun's glow and corona, a dense starfield with a faint
// nebula backdrop, and soft shadows — all present at boot.
//
// Rendering-smoke seam (ADR-0004): the polish features are mirrored to the
// #polish-status element from the scene's actual construction (atmosphere
// shell count, ring band count, Sun glow layers, starfield points, nebula
// presence) plus the renderer/composer state main.ts owns (bloom + tone
// mapping, PCFSoft shadows). Asserting the seam is the smoke check that the
// premium look is actually built; the scene boots with no console errors is
// the ticket's own acceptance smoke test. Screenshots are artifacts for the
// slice review sheet.

const ATMOSPHERE_BODIES = 8; // Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Titan
const SATURN_RING_BANDS = 6; // D, C, B, Cassini division, A, F
const SUN_GLOW_LAYERS = 2; // inner glow + outer corona
const STAR_COUNT = 5800; // derived from createStarfield's layers (5000 + 800)

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

/** The polish seam mirrors the scene's actual construction at boot. */
async function polishSeam(page: Page) {
  const seam = page.locator("#polish-status");
  await expect(seam).toHaveAttribute("data-atmospheres", String(ATMOSPHERE_BODIES));
  await expect(seam).toHaveAttribute("data-rings", String(SATURN_RING_BANDS));
  await expect(seam).toHaveAttribute("data-glow", String(SUN_GLOW_LAYERS));
  await expect(seam).toHaveAttribute("data-stars", String(STAR_COUNT));
  await expect(seam).toHaveAttribute("data-nebula", "true");
  await expect(seam).toHaveAttribute("data-postprocessing", "bloom-tonemap");
  await expect(seam).toHaveAttribute("data-shadows", "pcfsoft");
  return seam;
}

test("boots with the full visual polish, no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await boot(page);
  const seam = await polishSeam(page);
  await expect(seam).toContainText(
    `${ATMOSPHERE_BODIES} atmospheres, ${SATURN_RING_BANDS} ring bands`
  );
  await expect(seam).toContainText("bloom + tone mapping");
  await expect(seam).toContainText("soft shadows");

  expect(errors).toEqual([]);

  // Artifact for the slice review sheet: the polished opening overview.
  await page.screenshot({ path: "test-results/polish-overview.png" });
});

test("Saturn renders its rings with the Cassini gap", async ({ page }) => {
  await boot(page);

  // Focus Saturn through the canvas at its projected position (the label
  // floats above the anchor point where the body actually is), retrying
  // while the sim runs — at the overview zoom an overlapping moon label can
  // steal a label click, and a day per second of sim time drifts it clear.
  const saturn = page.locator('[data-body="Saturn"]');
  await expect(saturn).toBeVisible();
  for (let attempt = 0; attempt < 8; attempt++) {
    const box = (await saturn.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + 1.5 * box.height);
    if ((await page.locator("#camera-state").textContent()) === "focus:Saturn") break;
    await page.waitForTimeout(600);
  }
  await expect(page.locator("#camera-state")).toHaveText("focus:Saturn");
  // Let the focus transition settle, then screenshot the rings for the
  // review sheet — the seam already proved the six bands and the Cassini
  // division exist; the artifact shows them reading visually.
  await page.waitForTimeout(1200);

  await page.screenshot({ path: "test-results/polish-saturn-rings.png" });
});

test("the Sun glows and the overview shows the dense starfield", async ({ page }) => {
  await boot(page);

  // Focus the Sun through the canvas at its projected position (the label
  // floats above the anchor point), retrying while the sim runs — same
  // overlap-robust pattern as the Saturn test.
  const sun = page.locator('[data-body="Sun"]');
  await expect(sun).toBeVisible();
  for (let attempt = 0; attempt < 8; attempt++) {
    const box = (await sun.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + 1.5 * box.height);
    if ((await page.locator("#camera-state").textContent()) === "focus:Sun") break;
    await page.waitForTimeout(600);
  }
  await expect(page.locator("#camera-state")).toHaveText("focus:Sun");
  await page.waitForTimeout(1200);

  await page.screenshot({ path: "test-results/polish-sun-glow.png" });
});
