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
});
