import { test, expect } from "@playwright/test";

test.describe("PWA Install", () => {
  test("document has viewport meta with width=device-width", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    const content = await viewport.getAttribute("content");
    expect(content).toContain("width=device-width");
  });

  test("document has manifest.json link in head", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);
    const href = await manifest.getAttribute("href");
    expect(href).toContain("manifest");
  });

  test("document has theme-color meta tag with value", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);
    const content = await themeColor.getAttribute("content");
    expect(content!.length).toBeGreaterThan(0);
  });
});
