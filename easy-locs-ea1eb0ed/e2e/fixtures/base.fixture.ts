import { test as base, expect, type Page } from "@playwright/test";
import {
  getSeededListingIds,
  SEED_LISTING,
  SEED_LISTING_2,
  SEED_WALLET,
} from "../seed/load-state";

type Fixtures = {
  authenticatedPage: Page;
  seededListingIds: string[];
  seedListing: typeof SEED_LISTING;
  seedListing2: typeof SEED_LISTING_2;
  seedWallet: typeof SEED_WALLET;
};

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set for authenticated tests (skipped in fork PRs).");
      return;
    }

    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");

    const passwordTab = page.locator(".flex.gap-1.bg-muted\\/50 button").filter({ hasText: /password/i });
    await passwordTab.click();

    await expect(page.locator("#login-email")).toBeVisible({ timeout: 10000 });
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.locator('form button[type="submit"]').click();

    await expect(async () => {
      const hasAuthTokens = await page.evaluate(() => {
        const key = Object.keys(localStorage).find(
          (k) => k.includes("supabase") && k.includes("auth")
        );
        if (!key) return false;
        try {
          const val = JSON.parse(localStorage.getItem(key) || "{}");
          return !!val.access_token;
        } catch {
          return false;
        }
      });
      expect(hasAuthTokens).toBe(true);
    }).toPass({ timeout: 15000 });

    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      await page.waitForTimeout(2000);
      if (page.url().includes("/login")) {
        throw new Error(
          `Authentication failed: still on ${page.url()} after login. ` +
          "Verify E2E_TEST_EMAIL and E2E_TEST_PASSWORD are valid credentials."
        );
      }
    }

    await use(page);
  },

  // eslint-disable-next-line no-empty-pattern
  seededListingIds: async ({}, use) => {
    await use(getSeededListingIds());
  },

  // eslint-disable-next-line no-empty-pattern
  seedListing: async ({}, use) => {
    await use(SEED_LISTING);
  },

  // eslint-disable-next-line no-empty-pattern
  seedListing2: async ({}, use) => {
    await use(SEED_LISTING_2);
  },

  // eslint-disable-next-line no-empty-pattern
  seedWallet: async ({}, use) => {
    await use(SEED_WALLET);
  },
});

export { expect };
