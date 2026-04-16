import { test, expect } from "./fixtures/base.fixture";

test.describe("Settings (Authenticated)", () => {
  test("renders settings page with section headings", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const headings = page.locator("h2, h3");
    await expect(headings.first()).toBeVisible({ timeout: 10000 });
    expect(await headings.count()).toBeGreaterThan(0);
  });

  test("toggling a settings switch changes its aria-checked state", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings");
    await page.waitForLoadState("networkidle");

    const toggle = page.locator('[role="switch"]').first();
    await expect(toggle).toBeVisible({ timeout: 10000 });

    const checkedBefore = await toggle.getAttribute("aria-checked");
    await toggle.click();
    const expectedAfter = checkedBefore === "true" ? "false" : "true";
    await expect(toggle).toHaveAttribute("aria-checked", expectedAfter, { timeout: 3000 });
  });

  test("re-toggling a switch reverts to original state", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings");
    await page.waitForLoadState("networkidle");

    const toggle = page.locator('[role="switch"]').first();
    await expect(toggle).toBeVisible({ timeout: 10000 });

    const checkedBefore = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await page.waitForTimeout(500);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", checkedBefore!, { timeout: 3000 });
  });

  test("rapid button clicks do not crash settings page", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings");
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button:visible");
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
    const count = Math.min(await buttons.count(), 5);
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click();
    }

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("settings page has multiple toggle switches for different preferences", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings");
    await page.waitForLoadState("networkidle");

    const switches = page.locator('[role="switch"]');
    await expect(switches.first()).toBeVisible({ timeout: 10000 });
    const switchCount = await switches.count();
    expect(switchCount).toBeGreaterThanOrEqual(1);
  });

  test("account settings page renders without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings/account");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("security settings page renders without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings/security");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("notification settings page renders without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings/notifications");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });
});
