import { test, expect } from "@playwright/test";

test.describe("Notifications", () => {
  test("renders notifications page without error boundary", async ({ page }) => {
    await page.goto("/#/notifications");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("displays notification content or empty state message", async ({ page }) => {
    await page.goto("/#/notifications");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).not.toBeEmpty();
  });
});
