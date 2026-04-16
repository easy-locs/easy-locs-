import { test, expect } from "@playwright/test";

test.describe("Signup Flow", () => {
  test("renders Phone and Email mode tabs", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });

    const modeTabs = page.locator(".flex.gap-1 button");
    await expect(modeTabs).toHaveCount(2);
  });

  test("clicking Email tab reveals name, email, password fields with required attribute", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    const nameInput = page.locator('form input[type="text"][required]');
    await expect(nameInput).toBeVisible({ timeout: 3000 });

    const emailInput = page.locator('form input[type="email"][required]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('form input[type="password"][required]');
    await expect(passwordInput).toBeVisible();
  });

  test("typed values bind to name, email, and password fields", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    const nameInput = page.locator('form input[type="text"][required]');
    await nameInput.fill("Jean Dupont");
    await expect(nameInput).toHaveValue("Jean Dupont");

    const emailInput = page.locator('form input[type="email"][required]');
    await emailInput.fill("jean@test.com");
    await expect(emailInput).toHaveValue("jean@test.com");

    const passwordInput = page.locator('form input[type="password"][required]');
    await passwordInput.fill("StrongPass1!");
    await expect(passwordInput).toHaveValue("StrongPass1!");
  });

  test("submitting with weak password (no uppercase/digit) shows destructive toast", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    await page.locator('form input[type="text"][required]').fill("Test");
    await page.locator('form input[type="email"][required]').fill("test@test.com");
    await page.locator('form input[type="password"][required]').fill("weak");

    await page.locator('form button[type="submit"]').click();

    const toast = page.locator("[data-state='open']");
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test("login link navigates to /login with h1 visible", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.locator('a[href="/login"]').click();
    await page.waitForURL(/login/, { timeout: 5000 });
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
  });

  test("Phone tab renders phone number input for signup", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    const phoneTab = page.locator(".flex.gap-1 button").first();
    await phoneTab.click();

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="téléphone" i], input[placeholder*="numéro" i]');
    await expect(phoneInput.first()).toBeVisible({ timeout: 5000 });
  });

  test("empty name prevents signup form from submitting", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    await page.locator('form input[type="email"][required]').fill("test@test.com");
    await page.locator('form input[type="password"][required]').fill("StrongPass1!");

    await page.locator('form button[type="submit"]').click();

    const nameInput = page.locator('form input[type="text"][required]');
    const isInvalid = await nameInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
    expect(page.url()).toContain("/signup");
  });

  test("empty email prevents signup form from submitting", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    await page.locator('form input[type="text"][required]').fill("Test User");
    await page.locator('form input[type="password"][required]').fill("StrongPass1!");

    await page.locator('form button[type="submit"]').click();

    const emailInput = page.locator('form input[type="email"][required]');
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
    expect(page.url()).toContain("/signup");
  });

  test("submit button shows loading or disabled state after clicking", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    await page.locator('form input[type="text"][required]').fill("E2E Signup");
    await page.locator('form input[type="email"][required]').fill("e2e-signup-test@fake.com");
    await page.locator('form input[type="password"][required]').fill("StrongPass1!");

    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.click();

    await expect(async () => {
      const isDisabled = await submitBtn.isDisabled();
      const hasSpinner = await submitBtn.locator(".animate-spin, [data-loading]").isVisible().catch(() => false);
      const hasToast = await page.locator("[data-state='open'], [data-sonner-toast]").isVisible().catch(() => false);
      expect(isDisabled || hasSpinner || hasToast).toBe(true);
    }).toPass({ timeout: 10000 });
  });

  test("signup form with valid strong password submits and shows response", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();

    await page.locator('form input[type="text"][required]').fill("E2E Test User");
    await page.locator('form input[type="email"][required]').fill(`e2e-${Date.now()}@fake-test.com`);
    await page.locator('form input[type="password"][required]').fill("E2eStrongPass1!");

    const urlBefore = page.url();
    await page.locator('form button[type="submit"]').click();

    await expect(async () => {
      const toastAppeared = await page.locator("[data-state='open'], [data-sonner-toast]").isVisible().catch(() => false);
      const urlChanged = page.url() !== urlBefore;
      expect(toastAppeared || urlChanged).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test("switching between Phone and Email tabs changes visible form fields", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /email/i }).click();
    await expect(page.locator('form input[type="email"][required]')).toBeVisible({ timeout: 3000 });

    const phoneTab = page.locator(".flex.gap-1 button").first();
    await phoneTab.click();
    await page.waitForTimeout(500);

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="téléphone" i]');
    await expect(phoneInput.first()).toBeVisible({ timeout: 5000 });
  });
});
