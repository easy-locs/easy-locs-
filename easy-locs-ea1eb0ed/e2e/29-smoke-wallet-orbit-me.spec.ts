/**
 * #29 — Smoke: Radar — wallet, orbit, me pillar routes
 *
 * Three pillars that need deep-smoke coverage beyond what the existing
 * cross-pillar specs provide.
 *
 *  • Wallet:  /wallet, /wallet/top-up, /wallet/transfer, /wallet/request,
 *             /wallet/forex, /wallet/virtual-cards, /wallet/installments,
 *             /my-orders, /checkout, /pos
 *
 *  • Orbit (messaging):  /orbit, /orbit/contacts, /orbit/add,
 *                        /orbit/identity, /orbit/support
 *
 *  • Me (profile hub):   /me + all sub-routes
 *
 * Public routes (no auth needed) and authenticated routes are handled in
 * separate describe blocks.
 */
import { test, expect } from "@playwright/test";
import {
  test as authTest,
  expect as authExpect,
} from "./fixtures/base.fixture";

// ---------------------------------------------------------------------------
// Helper — public page
// ---------------------------------------------------------------------------

async function assertPublic(
  page: import("@playwright/test").Page,
  hash: string,
) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState("networkidle");
  const hashPath = new URL(page.url()).hash.replace(/^#/, "") || "/";
  expect(hashPath).not.toMatch(/^\/login(\b|$)/);
  await expect(
    page.locator('[data-testid="error-fallback"], .error-boundary'),
  ).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Helper — authenticated page
// ---------------------------------------------------------------------------

async function assertAuth(
  page: import("@playwright/test").Page,
  hash: string,
) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState("networkidle");
  const hashPath = new URL(page.url()).hash.replace(/^#/, "") || "/";
  expect(hashPath, `Auth route ${hash} redirected to login`).not.toMatch(
    /^\/login(\b|$)/,
  );
  await authExpect(
    page.locator('[data-testid="error-fallback"], .error-boundary'),
  ).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Wallet — public entry points
// ---------------------------------------------------------------------------

test.describe("Smoke — Wallet public entry (#29)", () => {
  for (const [label, hash] of [
    ["Checkout", "/checkout"],
    ["POS (main)", "/pos"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublic(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Wallet — authenticated routes
// ---------------------------------------------------------------------------

authTest.describe("Smoke — Wallet authenticated (#29)", () => {
  for (const [label, hash] of [
    ["Wallet hub", "/wallet"],
    ["Wallet top-up", "/wallet/top-up"],
    ["Wallet transfer", "/wallet/transfer"],
    ["Wallet request", "/wallet/request"],
    ["Wallet forex", "/wallet/forex"],
    ["Wallet virtual cards", "/wallet/virtual-cards"],
    ["Wallet installments", "/wallet/installments"],
    ["My orders", "/my-orders"],
    ["My orders active", "/my-orders/active"],
    ["My orders archive", "/my-orders/archive"],
    ["Checkout address selector", "/checkout/address-selector"],
    ["Checkout split bill", "/checkout/split-bill"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertAuth(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Orbit (messaging)
// ---------------------------------------------------------------------------

authTest.describe("Smoke — Orbit messaging (#29)", () => {
  for (const [label, hash] of [
    ["Orbit root (messaging hub)", "/orbit"],
    ["Orbit contacts", "/orbit/contacts"],
    ["Orbit add contact", "/orbit/add"],
    ["Orbit identity", "/orbit/identity"],
    ["Orbit AI support", "/orbit/support"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertAuth(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Me (profile / consumer hub)
// ---------------------------------------------------------------------------

authTest.describe("Smoke — Me profile hub (#29)", () => {
  for (const [label, hash] of [
    ["Me command center", "/me"],
    ["Me edit profile", "/me/edit-profile"],
    ["Me spending insights", "/me/spending-insights"],
    ["Me address book", "/me/address-book"],
    ["Me loyalty history", "/me/loyalty-history"],
    ["Me challenges", "/me/challenges"],
    ["Me referral", "/me/referral"],
    ["Me social hub", "/me/social"],
    ["Me badges", "/me/badges"],
    ["Me reviews", "/me/reviews"],
    ["Me wishlist", "/me/wishlist"],
    ["Me creator dashboard", "/me/creator"],
    ["Me creator analytics", "/me/creator/analytics"],
    ["Me creator affiliates", "/me/creator/affiliates"],
    ["Me creator tips", "/me/creator/tips"],
    ["Me saved cards", "/me/saved-cards"],
    ["Me saved carts", "/me/saved-carts"],
    ["Me delivery notes", "/me/delivery-notes"],
    ["Me payment activity", "/me/payment-activity"],
    ["Me order receipts", "/me/order-receipts"],
    ["Me properties cockpit", "/me/properties"],
    ["Me properties list", "/me/properties/list"],
    ["Me properties create", "/me/properties/create"],
    ["Me properties analytics", "/me/properties/analytics"],
    ["Me tenants", "/me/tenants"],
    ["Me leases", "/me/leases"],
    ["Me maintenance", "/me/maintenance"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertAuth(page, hash);
    });
  }
});
