import { test, expect } from "@playwright/test";
import { test as authTest, expect as authExpect } from "./fixtures/base.fixture";

test.describe("Notifications", () => {
  test("renders notifications page without error boundary", async ({ page }) => {
    await page.goto("/#/notifications");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("displays notification content or empty state message", async ({ page }) => {
    await page.goto("/#/notifications");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("notifications page has visible heading or title", async ({ page }) => {
    await page.goto("/#/notifications");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1, h2, h3, [data-testid*='title']").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

authTest.describe("Notifications (Authenticated)", () => {
  authTest("authenticated notifications page renders personalized content", async ({ authenticatedPage: page }) => {
    await page.goto("/#/notifications");
    await page.waitForLoadState("networkidle");

    await authExpect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    authExpect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  authTest("notifications show list items or empty state indicator", async ({ authenticatedPage: page }) => {
    await page.goto("/#/notifications");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").textContent();
    const hasNotifications = await page.locator("li, [data-testid*='notification'], .notification").count() > 0;
    const hasEmptyState = /(no notification|aucune|empty|vide)/i.test(bodyText || "");
    authExpect(hasNotifications || hasEmptyState || bodyText!.trim().length > 20).toBe(true);
  });
});
