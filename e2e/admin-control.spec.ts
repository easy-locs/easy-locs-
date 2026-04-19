import { test, expect } from "@playwright/test";

const SUPER_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL;
const SUPER_PASSWORD = process.env.E2E_SUPER_ADMIN_PASSWORD;

test.describe("admin control plane", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !SUPER_EMAIL || !SUPER_PASSWORD,
      "E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD must be set to run admin control plane tests — skipping.",
    );

    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    const passwordTab = page
      .locator(".flex.gap-1.bg-muted\\/50 button")
      .filter({ hasText: /password/i });
    await passwordTab.click();

    await expect(page.locator("#login-email")).toBeVisible({ timeout: 10000 });
    await page.locator("#login-email").fill(SUPER_EMAIL!);
    await page.locator("#login-password").fill(SUPER_PASSWORD!);
    await page.locator('form button[type="submit"]').click();

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const key = Object.keys(localStorage).find(
              (k) => k.includes("supabase") && k.includes("auth"),
            );
            if (!key) return false;
            try {
              const val = JSON.parse(localStorage.getItem(key) || "{}");
              return !!val.access_token;
            } catch {
              return false;
            }
          }),
        { timeout: 15000 },
      )
      .toBe(true);
  });

  test("overview route renders without crashing", async ({ page }) => {
    await page.goto("/#/admin/control/overview");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("[data-testid='admin-control-shell']"),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator("[data-testid='admin-access-denied']"),
    ).not.toBeVisible();
  });

  test("agents route renders without crashing", async ({ page }) => {
    await page.goto("/#/admin/control/agents");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("[data-testid='admin-control-shell']"),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator("[data-testid='admin-access-denied']"),
    ).not.toBeVisible();
  });
});
