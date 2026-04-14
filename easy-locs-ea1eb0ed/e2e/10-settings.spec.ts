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

  test("rapid button clicks do not crash settings page", async ({ authenticatedPage: page }) => {
    await page.goto("/#/settings");
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button:visible");
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
    const count = Math.min(await buttons.count(), 3);
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click();
    }

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });
});
