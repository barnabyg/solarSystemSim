import { expect, test } from "@playwright/test";

// Ticket #4 walking skeleton: the Sun and eight planets render on their
// orbits with labels, starting at their real positions for today's date.
// Rendering smoke seam (ADR-0004): scene boot, body presence, motion — the
// renderer is otherwise trusted within smoke-level checks.

const BODY_NAMES = ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];

test("boots and shows the Sun and all eight planets with labels", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  // Every body has a name label — the DOM surface of body presence.
  for (const name of BODY_NAMES) {
    await expect(page.locator(`[data-body="${name}"]`)).toBeVisible();
  }

  // The overview shows the whole system: this slice's labels sit at
  // distinct, spread-out screen positions rather than piling up at one
  // point. (Later slices add the moons and dwarf planets' labels, so the
  // spread check stays scoped to this slice's nine bodies.)
  const viewport = page.viewportSize()!;
  // Filter by name here, in the test process: `evaluateAll` runs in the
  // browser, where module constants like BODY_NAMES are not in scope.
  const boxes = await page.locator(".body-label").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { name: (el as HTMLElement).dataset.body ?? "", x: r.x, y: r.y };
    })
  );
  const scoped = boxes.filter((b) => BODY_NAMES.includes(b.name));
  expect(scoped).toHaveLength(BODY_NAMES.length);
  const uniquePositions = new Set(scoped.map((b) => `${Math.round(b.x)},${Math.round(b.y)}`));
  expect(uniquePositions.size).toBe(BODY_NAMES.length);
  const xs = scoped.map((b) => b.x);
  const ys = scoped.map((b) => b.y);
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(viewport.width * 0.25);
  expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(viewport.height * 0.15);

  expect(errors).toEqual([]);

  // Artifact for the slice review sheet: the opening overview.
  await page.screenshot({ path: "test-results/opening-overview.png" });
});

test("bodies start at their real positions for today's date", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  // The sim-date seam is set from the clock, which starts at today's date.
  await expect(page.locator("#sim-date")).not.toHaveText("");
  const shown = await page.locator("#sim-date").textContent();
  const shownMs = Date.parse(`${shown}T00:00:00Z`);
  const todayMs = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  // One day of tolerance covers the midnight boundary between load and assert.
  expect(Math.abs(shownMs - todayMs)).toBeLessThanOrEqual(86400000);
});

test("planets orbit over time at the day-per-second default warp", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  const simDate = page.locator("#sim-date");
  const before = await simDate.textContent();

  // Mercury is the fastest mover; its label must drift on screen.
  const mercury = page.locator('[data-body="Mercury"]');
  const boxBefore = await mercury.boundingBox();
  await page.waitForTimeout(3500);
  const boxAfter = await mercury.boundingBox();

  expect(boxBefore).not.toBeNull();
  expect(boxAfter).not.toBeNull();
  const drift = Math.abs(boxAfter!.x - boxBefore!.x) + Math.abs(boxAfter!.y - boxBefore!.y);
  expect(drift).toBeGreaterThan(2);

  // At one sim-day per real second, the sim date has advanced.
  await expect(simDate).not.toHaveText(before!);
});

test("holds a playable frame rate at the opening overview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boot-status")).toHaveText("booted");

  // Regression guard, not the ADR-0003 60 fps target — the e2e host is not
  // that hardware. A catastrophic rendering regression (per-frame geometry
  // rebuilds, unbounded draw calls) falls far below this floor.
  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        const step = () => {
          frames++;
          if (performance.now() - start >= 2000) {
            resolve((frames * 1000) / (performance.now() - start));
          } else {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      })
  );
  expect(fps).toBeGreaterThanOrEqual(20);
});
