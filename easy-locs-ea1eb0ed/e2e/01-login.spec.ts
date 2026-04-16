import { test, expect } from "@playwright/test";
import { test as authTest, expect as authExpect } from "./fixtures/base.fixture";

test.describe("Login Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");
  });

  test("renders login heading and three mode tabs (Phone, Password, OTP)", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    const modeTabs = page.locator(".flex.gap-1 button");
    await expect(modeTabs).toHaveCount(3);
  });

  test("Password tab reveals email and password inputs with correct attributes", async ({ page }) => {
    await page.getByRole("button", { name: /password/i }).click();

    const emailInput = page.locator("#login-email");
    await expect(emailInput).toBeVisible({ timeout: 3000 });
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");

    const passwordInput = page.locator("#login-password");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("typing credentials binds values to email and password fields", async ({ page }) => {
    await page.getByRole("button", { name: /password/i }).click();

    await page.locator("#login-email").fill("user@test.com");
    await expect(page.locator("#login-email")).toHaveValue("user@test.com");

    await page.locator("#login-password").fill("MySecurePass1!");
    await expect(page.locator("#login-password")).toHaveValue("MySecurePass1!");
  });

  test("invalid credentials show error toast and remain on login page", async ({ page }) => {
    await page.getByRole("button", { name: /password/i }).click();

    await page.locator("#login-email").fill("nonexistent@fake.com");
    await page.locator("#login-password").fill("WrongPassword1!");
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator("[data-state='open'], [data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("empty email field prevents form submission via HTML validation", async ({ page }) => {
    await page.getByRole("button", { name: /password/i }).click();
    await page.locator("#login-password").fill("SomePassword1!");
    await page.locator('form button[type="submit"]').click();

    const isInvalid = await page.locator("#login-email").evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
    expect(page.url()).toContain("/login");
  });

  test("empty password field prevents form submission via HTML validation", async ({ page }) => {
    await page.getByRole("button", { name: /password/i }).click();
    await page.locator("#login-email").fill("user@test.com");
    await page.locator('form button[type="submit"]').click();

    const isInvalid = await page.locator("#login-password").evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
    expect(page.url()).toContain("/login");
  });

  test("submit button disables or shows spinner during authentication attempt", async ({ page }) => {
    await page.getByRole("button", { name: /password/i }).click();
    await page.locator("#login-email").fill("loading-test@fake.com");
    await page.locator("#login-password").fill("TestPassword1!");

    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.click();

    await expect(async () => {
      const isDisabled = await submitBtn.isDisabled();
      const hasSpinner = await submitBtn.locator(".animate-spin").isVisible().catch(() => false);
      const hasToast = await page.locator("[data-state='open'], [data-sonner-toast]").isVisible().catch(() => false);
      expect(isDisabled || hasSpinner || hasToast).toBe(true);
    }).toPass({ timeout: 10000 });
  });

  test("'Create Account' link navigates to signup page", async ({ page }) => {
    await page.locator('a[href="/signup"]').click();
    await page.waitForURL(/signup/, { timeout: 5000 });
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
  });

  test("forgot password link navigates to forgot-password page", async ({ page }) => {
    await page.getByRole("button", { name: /password/i }).click();

    const forgotLink = page.locator('a[href*="forgot"]').first();
    await expect(forgotLink).toBeVisible({ timeout: 5000 });
    await forgotLink.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toMatch(/forgot/);
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("Phone tab shows tel input for phone number entry", async ({ page }) => {
    const phoneTab = page.locator(".flex.gap-1 button").first();
    await phoneTab.click();

    await expect(page.locator('input[type="tel"]')).toBeVisible({ timeout: 5000 });
  });

  test("OTP tab shows email input and verification flow", async ({ page }) => {
    const otpTab = page.locator(".flex.gap-1 button").last();
    await otpTab.click();

    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible({ timeout: 5000 });
  });
});

authTest.describe("Login — Authenticated Session Verification", () => {
  authTest("successful login stores Supabase auth tokens in localStorage", async ({ authenticatedPage: page }) => {
    const authTokenKey = await page.evaluate(() => {
      return Object.keys(localStorage).find(
        (k) => k.includes("supabase") && k.includes("auth")
      );
    });
    authExpect(authTokenKey).toBeTruthy();

    const tokenValue = await page.evaluate((key) => {
      return localStorage.getItem(key!);
    }, authTokenKey);
    authExpect(tokenValue).toBeTruthy();
    const parsed = JSON.parse(tokenValue!);
    authExpect(parsed).toHaveProperty("access_token");
  });

  authTest("authenticated user accesses protected routes without redirect to login", async ({ authenticatedPage: page }) => {
    for (const route of ["/#/dashboard", "/#/wallet", "/#/me"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      await authExpect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
      authExpect(page.url()).not.toContain("/login");
    }
  });

  authTest("session persists after full page reload", async ({ authenticatedPage: page }) => {
    await page.goto("/#/dashboard");
    await page.waitForLoadState("networkidle");

    await page.reload();
    await page.waitForLoadState("networkidle");

    const hasToken = await page.evaluate(() => {
      return Object.keys(localStorage).some(
        (k) => k.includes("supabase") && k.includes("auth")
      );
    });
    authExpect(hasToken).toBe(true);
    authExpect(page.url()).not.toContain("/login");
  });
});
