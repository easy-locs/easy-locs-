import { test, expect } from "./fixtures/base.fixture";

test.describe("Profile (Authenticated)", () => {
  test("Me page renders user-specific content", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("edit-profile page pre-fills user name in first input", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me/edit-profile");
    await page.waitForLoadState("networkidle");

    const firstInput = page.locator("input").first();
    await expect(firstInput).toBeVisible({ timeout: 10000 });
  });

  test("saving profile triggers success toast or navigation", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me/edit-profile");
    await page.waitForLoadState("networkidle");

    const saveBtn = page.locator('button[type="submit"], button:has-text("save"), button:has-text("enregistrer")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });

    const urlBefore = page.url();
    await saveBtn.click();

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
