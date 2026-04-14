import { test, expect } from "@playwright/test";

const PILLARS = [
  { name: "Dashboard", path: "/#/dashboard" },
  { name: "Radar", path: "/#/radar" },
  { name: "Orbit", path: "/#/orbit" },
  { name: "Wallet", path: "/#/wallet" },
  { name: "Me", path: "/#/me" },
];

test.describe("5-Pillar Navigation", () => {
  for (const pillar of PILLARS) {
    test(`${pillar.name}: renders without error boundary`, async ({ page }) => {
      await page.goto(pillar.path);
      await page.waitForLoadState("networkidle");

      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    });
  }

  test("landing page has a <nav> element", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("nav").first()).toBeVisible({ timeout: 5000 });
  });

  test("landing page navbar has ThemeSwitcher button with aria-label", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('button[aria-label="Toggle theme"]')).toBeVisible({ timeout: 5000 });
  });
});
