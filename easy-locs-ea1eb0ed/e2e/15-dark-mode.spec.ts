import { test, expect } from "@playwright/test";

test.describe("Dark Mode", () => {
  test("ThemeSwitcher dropdown opens with Light, Dark, System options", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    await themeBtn.click();

    await expect(page.getByRole("button", { name: "Light" })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
    await expect(page.getByRole("button", { name: "System" })).toBeVisible();
  });

  test("selecting Dark sets class='dark' on <html>", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    await themeBtn.click();
    await page.getByRole("button", { name: "Dark" }).click();

    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 3000 });
  });

  test("selecting Light sets class='light' on <html>", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    await themeBtn.click();
    await page.getByRole("button", { name: "Light" }).click();

    await expect(page.locator("html")).toHaveClass(/light/, { timeout: 3000 });
  });

  test("Orbit Accent options (Gold, Blue) are shown in dropdown", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    await themeBtn.click();

    await expect(page.getByRole("button", { name: "Orbit Gold" })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("button", { name: "Orbit Blue" })).toBeVisible();
  });
});
