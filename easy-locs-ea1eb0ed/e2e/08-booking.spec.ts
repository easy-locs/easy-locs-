import { test, expect } from "@playwright/test";

test.describe("Booking Flow", () => {
  test("listings page renders clickable property links", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const links = page.locator("a[href]");
    await expect(links.first()).toBeVisible({ timeout: 10000 });
  });

  test("clicking listing navigates to detail page with property content", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator("a[href]").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });

    const urlBefore = page.url();
    await firstLink.click();

    await page.waitForFunction(
      (prevUrl) => window.location.href !== prevUrl,
      urlBefore,
      { timeout: 10000 }
    );

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("dashboard page has tab navigation for managing bookings", async ({ page }) => {
    await page.goto("/#/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    expect(await tabs.count()).toBeGreaterThan(1);

    await tabs.nth(1).click();
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });
});
