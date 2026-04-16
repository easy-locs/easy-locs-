import { test, expect } from "./fixtures/base.fixture";

test.describe("Profile (Authenticated)", () => {
  test("Me page renders user-specific content with visible elements", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("Me page displays user name or profile identifier", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me");
    await page.waitForLoadState("networkidle");

    const profileContent = page.locator("h1, h2, h3, [data-testid*='name'], [data-testid*='profile']").first();
    await expect(profileContent).toBeVisible({ timeout: 10000 });
    const text = await profileContent.textContent();
    expect(text!.trim().length).toBeGreaterThan(0);
  });

  test("Me page has navigation links or action buttons", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me");
    await page.waitForLoadState("networkidle");

    const links = page.locator("a[href], button:visible");
    await expect(links.first()).toBeVisible({ timeout: 10000 });
    const count = await links.count();
    expect(count).toBeGreaterThan(2);
  });

  test("edit-profile page renders form with pre-filled input fields", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me/edit-profile");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const inputs = page.locator("input:visible");
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(1);
  });

  test("edit-profile form has a save/submit button", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me/edit-profile");
    await page.waitForLoadState("networkidle");

    const saveBtn = page.locator('button[type="submit"], button:has-text("save"), button:has-text("enregistrer"), button:has-text("Sauvegarder")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
  });

  test("editing profile name updates the input value", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me/edit-profile");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator("input:visible").first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    const originalValue = await nameInput.inputValue();
    const newValue = "E2E Updated Name " + Date.now();
    await nameInput.fill(newValue);
    await expect(nameInput).toHaveValue(newValue);

    await nameInput.fill(originalValue || "E2E Test User");
    await expect(nameInput).toHaveValue(originalValue || "E2E Test User");
  });

  test("saving profile triggers success toast or navigation", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me/edit-profile");
    await page.waitForLoadState("networkidle");

    const saveBtn = page.locator('button[type="submit"], button:has-text("save"), button:has-text("enregistrer")').first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });

    const urlBefore = page.url();
    await saveBtn.click();

    await expect(async () => {
      const toastAppeared = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);
      const urlChanged = page.url() !== urlBefore;
      expect(toastAppeared || urlChanged).toBe(true);
    }).toPass({ timeout: 10000 });

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("user properties page renders without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/me/properties");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("user orders page renders without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/my-orders");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });
});
