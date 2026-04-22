/**
 * #26 — Smoke: merchant portal
 *
 * Logs in as the standard E2E test user and visits every route under
 * /merchant.  Each test asserts:
 *   1. No redirect to /login after authentication.
 *   2. No hard error boundary / crash screen.
 *
 * Routes that require a real merchantId param (e.g. /merchant/menu/:merchantId)
 * use the placeholder "demo" so the page at least mounts the component tree
 * without a crash (a graceful empty-state is acceptable).
 */
import { test as authTest, expect } from "./fixtures/base.fixture";

const DEMO_MERCHANT_ID = process.env.E2E_MERCHANT_ID || "demo";

async function assertPage(
  page: import("@playwright/test").Page,
  hash: string,
) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState("networkidle");

  const url = new URL(page.url());
  const hashPath = url.hash.replace(/^#/, "") || url.pathname;

  expect(hashPath, `Merchant route ${hash} redirected to login`).not.toMatch(
    /^\/login(\b|$)/,
  );

  await expect(
    page.locator('[data-testid="error-fallback"], .error-boundary'),
  ).toHaveCount(0);
}

authTest.describe("Smoke — Merchant portal core (#26)", () => {
  for (const [label, hash] of [
    ["Merchant dashboard", "/merchant/dashboard"],
    ["Merchant POS", "/merchant/pos"],
    ["Merchant kitchen", "/merchant/kitchen"],
    ["Merchant orders", "/merchant/orders"],
    ["Merchant menu", "/merchant/menu"],
    ["Merchant finance", "/merchant/finance"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertPage(page, hash);
    });
  }
});

authTest.describe("Smoke — Merchant portal (merchantId routes) (#26)", () => {
  for (const [label, path] of [
    ["Merchant menu (id)", `/merchant/menu/${DEMO_MERCHANT_ID}`],
    ["Merchant menu bulk edit (id)", `/merchant/menu-bulk/${DEMO_MERCHANT_ID}`],
    ["Merchant menu categories (id)", `/merchant/menu-categories/${DEMO_MERCHANT_ID}`],
    ["Merchant store settings (id)", `/merchant/store-settings/${DEMO_MERCHANT_ID}`],
    ["Merchant promos (id)", `/merchant/promos/${DEMO_MERCHANT_ID}`],
    ["Merchant inventory (id)", `/merchant/inventory/${DEMO_MERCHANT_ID}`],
    ["Merchant inventory alerts (id)", `/merchant/inventory-alerts/${DEMO_MERCHANT_ID}`],
    ["Merchant live control (id)", `/merchant/live/${DEMO_MERCHANT_ID}`],
    ["Merchant coupons (id)", `/merchant/coupons/${DEMO_MERCHANT_ID}`],
    ["Merchant analytics (id)", `/merchant/analytics/${DEMO_MERCHANT_ID}`],
    ["Merchant customers (id)", `/merchant/customers/${DEMO_MERCHANT_ID}`],
    ["Merchant customer insights (id)", `/merchant/customer-insights/${DEMO_MERCHANT_ID}`],
    ["Merchant product performance (id)", `/merchant/product-performance/${DEMO_MERCHANT_ID}`],
    ["Merchant business summary (id)", `/merchant/business-summary/${DEMO_MERCHANT_ID}`],
    ["Merchant closing mode (id)", `/merchant/closing-mode/${DEMO_MERCHANT_ID}`],
    ["Merchant auto-accept (id)", `/merchant/auto-accept/${DEMO_MERCHANT_ID}`],
    ["Merchant staff access (id)", `/merchant/staff-access/${DEMO_MERCHANT_ID}`],
    ["Merchant orders board (id)", `/merchant/orders/${DEMO_MERCHANT_ID}`],
    ["Merchant banner editor (id)", `/merchant/banner-editor/${DEMO_MERCHANT_ID}`],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertPage(page, path);
    });
  }
});
