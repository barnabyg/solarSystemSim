import { expect, test } from "@playwright/test";

test("the app boots and renders a Three.js scene", async ({ page }) => {
  await page.goto("/");

  // The boot marker is set by main.ts only after the first frame renders,
  // so its presence proves the render loop is actually drawing.
  await expect(page.locator("#boot-status")).toHaveText("booted");
  await expect(page.locator("#app canvas")).toBeVisible();
});
