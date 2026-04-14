import { test, expect } from "./fixtures/base.fixture";

test.describe("Checkout & Payment (Authenticated)", () => {
  test("renders checkout page without crash", async ({ authenticatedPage: page }) => {
    await page.goto("/#/checkout");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("checkout page has visible interactive buttons", async ({ authenticatedPage: page }) => {
    await page.goto("/#/checkout");
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button:visible");
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test("clicking checkout action button triggers dialog or navigation", async ({ authenticatedPage: page }) => {
    await page.goto("/#/checkout");
    await page.waitForLoadState("networkidle");

    const urlBefore = page.url();
    const actionBtn = page.locator("button:visible").first();
    await expect(actionBtn).toBeVisible({ timeout: 10000 });
    await actionBtn.click();

    await page.waitForFunction(
      (prevUrl) => {
        return document.querySelector('[role="dialog"]') !== null || window.location.href !== prevUrl;
      },
      urlBefore,
      { timeout: 5000 }
    );

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });
});
