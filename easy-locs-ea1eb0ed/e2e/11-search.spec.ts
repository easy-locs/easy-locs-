import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("renders explore page without error boundary", async ({ page }) => {
    await page.goto("/#/explore");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("radar search input accepts typed query and retains value", async ({ page }) => {
    await page.goto("/#/radar");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("input[placeholder]").first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("appartement paris");
    await expect(searchInput).toHaveValue("appartement paris");
  });
});
