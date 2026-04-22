/**
 * #25 — Smoke: dashboard protected pages
 *
 * Logs in as the standard E2E test user and visits every route under
 * /dashboard.  Each test asserts:
 *   1. No redirect to /login after authentication.
 *   2. No hard error boundary / crash screen.
 *
 * The authenticated fixture from base.fixture.ts handles login and skips
 * gracefully when credentials are absent (fork PRs, etc.).
 */
import { test as authTest, expect } from "./fixtures/base.fixture";

async function assertDashboardPage(
  page: import("@playwright/test").Page,
  hash: string,
) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState("networkidle");

  const url = new URL(page.url());
  const hashPath = url.hash.replace(/^#/, "") || url.pathname;

  // Must not fall back to the login screen.
  expect(hashPath, `Dashboard route ${hash} redirected to login`).not.toMatch(
    /^\/login(\b|$)/,
  );

  // No hard crash.
  await expect(
    page.locator('[data-testid="error-fallback"], .error-boundary'),
  ).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Core dashboard
// ---------------------------------------------------------------------------

authTest.describe("Smoke — Dashboard core (#25)", () => {
  for (const [label, hash] of [
    ["Dashboard home", "/dashboard"],
    ["Command center", "/dashboard/command-center"],
    ["Tasks", "/dashboard/tasks"],
    ["Documents", "/dashboard/documents"],
    ["Receipts", "/dashboard/receipts"],
    ["Reminders", "/dashboard/reminders"],
    ["Settings", "/dashboard/settings"],
    ["Billing", "/dashboard/billing"],
    ["AI assistant", "/dashboard/ai"],
    ["AI search", "/dashboard/ai-search"],
    ["Audit trail", "/dashboard/audit"],
    ["Developer portal", "/dashboard/developer"],
    ["News", "/dashboard/news"],
    ["Islamic section", "/dashboard/islamic"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertDashboardPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Property management
// ---------------------------------------------------------------------------

authTest.describe("Smoke — Dashboard property management (#25)", () => {
  for (const [label, hash] of [
    ["Add property", "/dashboard/property/add"],
    ["Create listing", "/dashboard/create-listing"],
    ["Leases", "/dashboard/leases"],
    ["Tenants", "/dashboard/tenants"],
    ["Rental management", "/dashboard/rental-management"],
    ["Buildings", "/dashboard/buildings"],
    ["Furniture inventory", "/dashboard/furniture-inventory"],
    ["Vault", "/dashboard/vault"],
    ["Calendar", "/dashboard/calendar"],
    ["Real estate listings", "/dashboard/real-estate"],
    ["Seasonal rentals (redirect)", "/dashboard/seasonal-rentals"],
    ["Rent cockpit", "/dashboard/rent-cockpit"],
    ["Dynamic pricing", "/dashboard/dynamic-pricing"],
    ["Candidates", "/dashboard/candidates"],
    ["Property hub", "/dashboard/properties"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertDashboardPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Finance & operations
// ---------------------------------------------------------------------------

authTest.describe("Smoke — Dashboard finance & ops (#25)", () => {
  for (const [label, hash] of [
    ["Finances", "/dashboard/finances"],
    ["Accounting", "/dashboard/accounting"],
    ["Accounting entries", "/dashboard/accounting-entries"],
    ["Expenses", "/dashboard/expenses"],
    ["Fiscal report", "/dashboard/fiscal-report"],
    ["Charges regularization", "/dashboard/charges-regularization"],
    ["Payment notices", "/dashboard/payment-notices"],
    ["Dunning letters", "/dashboard/dunning-letters"],
    ["Reporting dashboard", "/dashboard/reporting"],
    ["Finance summary", "/dashboard/finance-summary"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertDashboardPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Growth & collaboration
// ---------------------------------------------------------------------------

authTest.describe("Smoke — Dashboard growth & collaboration (#25)", () => {
  for (const [label, hash] of [
    ["Referrals", "/dashboard/referrals"],
    ["Referral funnel", "/dashboard/referral-funnel"],
    ["Collaboration", "/dashboard/collaboration"],
    ["Subscriptions", "/dashboard/subscriptions"],
    ["Channels", "/dashboard/channels"],
    ["Service tracking", "/dashboard/service-tracking"],
    ["Import data", "/dashboard/import"],
    ["CV generator", "/dashboard/cv-generator"],
    ["My shops", "/dashboard/my-shops"],
    ["Boost dashboard", "/dashboard/boost"],
    ["Army cockpit", "/dashboard/army"],
    ["Ops center", "/dashboard/ops"],
    ["Interventions", "/dashboard/interventions"],
    ["Profile (landlord)", "/dashboard/profile"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertDashboardPage(page, hash);
    });
  }
});
