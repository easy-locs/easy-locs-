import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("renders three mode tabs: Phone, Password, OTP", async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    const h1 = page.locator("h1");
    await expect(h1).toBeVisible({ timeout: 10000 });

    const modeTabs = page.locator(".flex.gap-1 button");
    await expect(modeTabs).toHaveCount(3);
  });

  test("clicking Password tab reveals #login-email and #login-password inputs", async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    const passwordTab = page.getByRole("button", { name: /password/i });
    await passwordTab.click();

    await expect(page.locator("#login-email")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("#login-email")).toHaveAttribute("type", "email");
    await expect(page.locator("#login-email")).toHaveAttribute("required", "");

    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator("#login-password")).toHaveAttribute("required", "");
  });

  test("typed credentials bind to email and password fields", async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /password/i }).click();
    await page.locator("#login-email").fill("user@test.com");
    await expect(page.locator("#login-email")).toHaveValue("user@test.com");

    await page.locator("#login-password").fill("MySecurePass1!");
    await expect(page.locator("#login-password")).toHaveValue("MySecurePass1!");
  });

  test("invalid credentials: form submits, URL stays on /login, destructive toast appears", async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /password/i }).click();
    await page.locator("#login-email").fill("nonexistent@fake.com");
    await page.locator("#login-password").fill("WrongPassword1!");

    await page.locator('form button[type="submit"]').click();

    const destructiveToast = page.locator("[data-state='open']");
    await expect(destructiveToast).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("'Create Account' link navigates to /signup with h1 visible", async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    await page.locator('a[href="/signup"]').click();
    await page.waitForURL(/signup/, { timeout: 5000 });

    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
  });
});
