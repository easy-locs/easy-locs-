import { test, expect } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

const KEY_PAGES = [
  { path: "/#/", name: "homepage" },
  { path: "/#/login", name: "login" },
  { path: "/#/signup", name: "signup" },
  { path: "/#/explore", name: "explore" },
  { path: "/#/real-estate", name: "marketplace" },
];

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  test.describe(`Visual regression — ${vpName} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: vp });

    for (const pg of KEY_PAGES) {
      test(`${pg.name} renders without visual regression at ${vpName}`, async ({
        page,
      }) => {
        await page.goto(pg.path);
        await page.waitForLoadState("networkidle");

        await expect(
          page.locator('.error-boundary, [data-testid="error-fallback"]')
        ).toHaveCount(0);

        const bodyText = await page.locator("body").textContent();
        expect(bodyText!.trim().length).toBeGreaterThan(0);

        await expect(page.locator("body")).toHaveScreenshot(
          `${pg.name}-${vpName}.png`,
          {
            maxDiffPixelRatio: 0.02,
            animations: "disabled",
          }
        );
      });
    }
  });
}

test.describe("Visual regression — responsive layout verification", () => {
  test("homepage has visible content at mobile viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const visibleElements = page.locator("h1, h2, h3, p, a, button, img").first();
    await expect(visibleElements).toBeVisible({ timeout: 10000 });

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(375);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 20);
  });

  test("homepage has visible navigation at desktop viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const navLinks = page.locator("nav a, nav button, [role='navigation'] a");
    await expect(navLinks.first()).toBeVisible({ timeout: 10000 });
    expect(await navLinks.count()).toBeGreaterThan(1);
  });

  test("login page renders form at all viewports without overflow", async ({ page }) => {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);
      await page.goto("/#/login");
      await page.waitForLoadState("networkidle");

      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

      const inputs = page.locator("input[type='email'], input[type='password'], input[type='text']");
      await expect(inputs.first()).toBeVisible({ timeout: 10000 });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(
        bodyWidth,
        `Login page overflows at ${vpName} (${vp.width}px)`
      ).toBeLessThanOrEqual(vp.width + 20);
    }
  });

  test("marketplace page renders cards at tablet viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const cards = page.locator("a[href], [data-testid='property-card']");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThan(0);

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(768);
  });
});
