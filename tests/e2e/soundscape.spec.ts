import { expect, test, type Page } from "@playwright/test";

// Ticket #12 soundscape: a subtle procedural ambient pad plus soft UI
// feedback blips, synthesized at runtime with the Web Audio API (zero audio
// assets), and a mute toggle that silences everything. UI-interaction seam
// (ADR-0004): the user-facing promises are exercised through the real DOM —
// the mute button's aria-pressed state, and the window.__soundscape mirror
// of what was scheduled to the audio graph (context state, mute flag,
// per-kind blip counts; muted blips are never scheduled). The synthesis
// internals (oscillator wiring, chord banks) are out of test scope; the
// zero-assets criterion is guarded by a unit test.

type BlipKind = "inspect" | "release" | "toggle" | "warp";

interface AudioSeam {
  contextState: AudioContextState | "unavailable";
  muted: boolean;
  ambient: boolean;
  blips: Record<BlipKind, number>;
}

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");
}

/** The live soundscape mirror main.ts publishes every frame. */
function readAudio(page: Page): Promise<AudioSeam> {
  return page.evaluate(() => {
    const seam = (window as unknown as { __soundscape?: AudioSeam }).__soundscape;
    if (!seam) throw new Error("missing window.__soundscape seam");
    return seam;
  });
}

test("shows a mute toggle; ambient audio is active and the toggle silences it", async ({ page }) => {
  await boot(page);

  const muteBtn = page.locator("#mute-btn");
  await expect(muteBtn).toBeVisible();
  await expect(muteBtn).toHaveAttribute("aria-pressed", "false");

  // The ambient pad is synthesized at runtime (zero assets) and is live from
  // boot. Browsers block audible output until a user gesture, so the first
  // interaction also resumes the AudioContext — the promise is "starts as
  // soon as the browser allows", never a click-to-enable wall.
  await expect.poll(async () => (await readAudio(page)).ambient).toBe(true);
  await muteBtn.click();
  await expect.poll(async () => (await readAudio(page)).contextState).toBe("running");
  await expect(page.locator("#audio-status")).toContainText("running");

  await expect(muteBtn).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await readAudio(page)).muted).toBe(true);

  // Artifact for the slice review sheet: the mute toggle.
  await page.screenshot({ path: "test-results/soundscape.png" });
});

test("UI feedback blips play on key interactions", async ({ page }) => {
  await boot(page);

  // Inspecting a body (clicking its label) opens the fact card and plays a
  // soft chime.
  await page.locator('[data-body="Earth"]').click();
  await expect.poll(async () => (await readAudio(page)).blips.inspect).toBeGreaterThanOrEqual(1);

  // Closing the card plays a lower, softer note.
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await readAudio(page)).blips.release).toBeGreaterThanOrEqual(1);

  // Space pauses the sim and ticks.
  await page.keyboard.press("Space");
  await expect.poll(async () => (await readAudio(page)).blips.toggle).toBeGreaterThanOrEqual(1);

  // A warp preset change ticks higher and shorter.
  await page.locator('[data-warp-preset="86400"]').click();
  await expect.poll(async () => (await readAudio(page)).blips.warp).toBeGreaterThanOrEqual(1);
});

test("mute silences all audio; unmute restores it", async ({ page }) => {
  await boot(page);

  // Baseline interactions first, so the silence check compares real counts:
  // inspecting Earth plays a chime, clicking away releases focus (back to the
  // free-flight overview) and plays the release note.
  await page.locator('[data-body="Earth"]').click();
  await expect.poll(async () => (await readAudio(page)).blips.inspect).toBeGreaterThanOrEqual(1);
  await page.mouse.click(30, 30);
  await expect.poll(async () => (await readAudio(page)).blips.release).toBeGreaterThanOrEqual(1);
  const before = await readAudio(page);

  await page.locator("#mute-btn").click();
  await expect(page.locator("#mute-btn")).toHaveAttribute("aria-pressed", "true");

  // Every interaction while muted must not reach the speakers: the played
  // counts stay frozen. One attempt per blip kind — toggle (Space), warp
  // (preset), release (Escape), inspect (clicking the Sun's label, which the
  // free-flight overview keeps clear of the card).
  await page.keyboard.press("Space");
  await page.locator('[data-warp-preset="1"]').click();
  await page.keyboard.press("Escape");
  await page.locator('[data-body="Sun"]').click();
  await page.waitForTimeout(250);
  const after = await readAudio(page);
  expect(after.blips).toEqual(before.blips);
  expect(after.muted).toBe(true);

  // Unmuting plays a soft confirm blip, and interactions sound again.
  await page.locator("#mute-btn").click();
  await expect(page.locator("#mute-btn")).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(async () => (await readAudio(page)).blips.toggle)
    .toBeGreaterThan(before.blips.toggle);
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await readAudio(page)).blips.toggle)
    .toBeGreaterThan(before.blips.toggle + 1);
});
