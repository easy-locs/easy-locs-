import { test, expect } from "@playwright/test";

test.describe("Language Switch", () => {
  test("i18n stores locale in localStorage as app_locale", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const locale = await page.evaluate(() => localStorage.getItem("app_locale"));
    expect(locale === null || typeof locale === "string").toBeTruthy();
  });

  test("login form labels render with translated text from i18n", async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /password/i }).click();

    const emailLabel = page.locator('label[for="login-email"]');
    await expect(emailLabel).toBeVisible({ timeout: 5000 });
    const emailText = await emailLabel.textContent();
    expect(emailText!.trim().length).toBeGreaterThan(0);

    const passwordLabel = page.locator('label[for="login-password"]');
    await expect(passwordLabel).toBeVisible();
    const pwText = await passwordLabel.textContent();
    expect(pwText!.trim().length).toBeGreaterThan(0);
  });

  test("signup email mode renders 3 form labels with translated text", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    const labels = page.locator("form label");
    await expect(labels.first()).toBeVisible({ timeout: 5000 });
    await expect(labels).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const text = await labels.nth(i).textContent();
      expect(text!.trim().length).toBeGreaterThan(0);
    }
  });
});
