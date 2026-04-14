import { test as base, expect, type Page } from "@playwright/test";

type Fixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set for authenticated tests."
      );
    }

    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    const passwordTab = page.locator(".flex.gap-1.bg-muted\\/50 button").filter({ hasText: /password/i });
    await passwordTab.click();

    await expect(page.locator("#login-email")).toBeVisible({ timeout: 10000 });
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.locator('form button[type="submit"]').click();

    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      const hasAuthTokens = await page.evaluate(() => {
        return Object.keys(localStorage).some(
          (k) => k.includes("supabase") && k.includes("auth")
        );
      });
      if (!hasAuthTokens) {
        throw new Error(
          `Authentication failed: still on ${currentUrl} with no Supabase auth tokens. ` +
          "Verify E2E_TEST_EMAIL and E2E_TEST_PASSWORD are valid credentials."
        );
      }
    }

    await use(page);
  },
});

export { expect };
