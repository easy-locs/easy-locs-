import { test, expect } from "./fixtures/base.fixture";

test.describe("Create Property (Authenticated)", () => {
  test("renders property form with text inputs and submit button", async ({ authenticatedPage: page }) => {
    await page.goto("/#/dashboard/property/add");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    await expect(page.locator('input[type="text"], input:not([type]), textarea').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("fills property title field and verifies value binding", async ({ authenticatedPage: page }) => {
    await page.goto("/#/dashboard/property/add");
    await page.waitForLoadState("networkidle");

    const titleInput = page.locator('input[type="text"], input:not([type])').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill("Appartement Centre-Ville E2E");
    await expect(titleInput).toHaveValue("Appartement Centre-Ville E2E");
  });

  test("submits property form: URL changes or success toast appears", async ({ authenticatedPage: page }) => {
    await page.goto("/#/dashboard/property/add");
    await page.waitForLoadState("networkidle");

    const titleInput = page.locator('input[type="text"], input:not([type])').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill("E2E Property " + Date.now());

    const urlBefore = page.url();
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    await page.waitForFunction(
      (prevUrl) => {
        return document.querySelector('[data-sonner-toast]') !== null || window.location.href !== prevUrl;
      },
      urlBefore,
      { timeout: 10000 }
    );

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });
});
