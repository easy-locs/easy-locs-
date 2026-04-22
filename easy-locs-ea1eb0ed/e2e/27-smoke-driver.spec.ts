/**
 * #27 — Smoke: driver portal
 *
 * Logs in as the standard E2E test user and visits every route under /driver.
 * Each test asserts:
 *   1. No redirect to /login after authentication.
 *   2. No hard error boundary / crash screen.
 *
 * Routes that require a real orderId param use the placeholder "demo" —
 * a graceful empty-state or 404 component is acceptable; a React crash is not.
 */
import { test as authTest, expect } from "./fixtures/base.fixture";

const DEMO_ORDER_ID = process.env.E2E_ORDER_ID || "demo";

async function assertPage(
  page: import("@playwright/test").Page,
  hash: string,
) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState("networkidle");

  const url = new URL(page.url());
  const hashPath = url.hash.replace(/^#/, "") || url.pathname;

  expect(hashPath, `Driver route ${hash} redirected to login`).not.toMatch(
    /^\/login(\b|$)/,
  );

  await expect(
    page.locator('[data-testid="error-fallback"], .error-boundary'),
  ).toHaveCount(0);
}

authTest.describe("Smoke — Driver portal (#27)", () => {
  for (const [label, hash] of [
    ["Driver dashboard", "/driver/dashboard"],
    ["Driver payout", "/driver/payout"],
    ["Driver earnings", "/driver/earnings"],
    ["Driver earnings summary", "/driver/earnings-summary"],
    ["Driver missions board", "/driver/missions-board"],
    ["Driver active missions", "/driver/active-missions"],
    ["Driver live missions", "/driver/live-missions"],
    ["Driver completed deliveries", "/driver/completed-deliveries"],
    ["Driver shift", "/driver/shift"],
    ["Driver availability zones", "/driver/availability-zones"],
    ["Driver fuel costs", "/driver/fuel-costs-v2"],
    ["Driver breaks", "/driver/breaks"],
    ["Driver taxi dashboard", "/driver/taxi"],
    ["Driver taxi earnings", "/driver/taxi/earnings"],
    ["Demand heatmap", "/driver/heatmap"],
    ["Seller dashboard", "/seller"],
    ["Business hub", "/business"],
    ["Driver proof (demo orderId)", `/driver/proof/${DEMO_ORDER_ID}`],
    [
      "Driver mission detail (demo orderId)",
      `/driver/missions-board/${DEMO_ORDER_ID}`,
    ],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertPage(page, hash);
    });
  }
});
