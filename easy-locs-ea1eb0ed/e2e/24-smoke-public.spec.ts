/**
 * #24 — Smoke: public routes (no authentication required)
 *
 * Visits every publicly accessible route and asserts the page:
 *   1. Does not show a hard error boundary / crash screen.
 *   2. Returns meaningful content (body.innerText length > 10).
 *   3. Does not redirect to /login.
 *
 * Organized in sub-groups matching the app's route files so failures are easy
 * to locate.  All tests are intentionally credential-free — any visitor can
 * reproduce them.
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function assertPublicPage(
  page: import("@playwright/test").Page,
  hash: string,
) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState("networkidle");

  const url = new URL(page.url());
  const hashPath = (url.hash.replace(/^#/, "") || url.pathname).split("?")[0];

  // Must not be silently redirected to the login gate.
  expect(hashPath, `Route ${hash} redirected to login unexpectedly`).not.toMatch(
    /^\/login(\b|$)/,
  );

  // No hard crash screen.
  await expect(
    page.locator('[data-testid="error-fallback"], .error-boundary'),
  ).toHaveCount(0);

  // Page body must contain visible content.
  const bodyLen = (await page.locator("body").innerText()).trim().length;
  expect(bodyLen, `Route ${hash} rendered an empty body`).toBeGreaterThan(10);
}

// ---------------------------------------------------------------------------
// Landing / root
// ---------------------------------------------------------------------------

test.describe("Smoke — Landing & home (#24)", () => {
  for (const [label, hash] of [
    ["Root /", "/"],
    ["Landing page", "/landing"],
    ["Pricing redirect", "/pricing"],
    ["Install PWA", "/install"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Auth routes (forms only — no submission)
// ---------------------------------------------------------------------------

test.describe("Smoke — Auth pages (#24)", () => {
  for (const [label, hash] of [
    ["Login page", "/login"],
    ["Signup page", "/signup"],
    ["Forgot password", "/forgot-password"],
    ["Reset password", "/reset-password"],
    ["Verify account", "/verify-account"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Radar — discovery & marketplace (public)
// ---------------------------------------------------------------------------

test.describe("Smoke — Radar / discovery (#24)", () => {
  for (const [label, hash] of [
    ["Radar / HyperRadar", "/radar"],
    ["Explore page", "/explore"],
    ["Search results", "/search-results"],
    ["Geo explorer", "/geo-explorer"],
    ["Browse (all verticals)", "/browse"],
    ["Browse — food", "/browse/food"],
    ["Browse — grocery", "/browse/grocery"],
    ["Browse — retail", "/browse/retail"],
    ["Browse — services", "/browse/services"],
    ["Browse — healthcare", "/browse/healthcare"],
    ["Browse — experiences", "/browse/experiences"],
    ["Browse — utility", "/browse/utility"],
    ["Shop index", "/shop"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Food vertical
// ---------------------------------------------------------------------------

test.describe("Smoke — Food vertical (#24)", () => {
  for (const [label, hash] of [
    ["Food hub redirect", "/food"],
    ["Food type: halal", "/food/halal"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Travel & mobility
// ---------------------------------------------------------------------------

test.describe("Smoke — Travel & mobility (#24)", () => {
  for (const [label, hash] of [
    ["Travel hub", "/travel"],
    ["Travel — flights", "/travel/flights"],
    ["Travel — stays", "/travel/stays"],
    ["Flight search", "/travel/flight-search"],
    ["Mobility hub", "/mobility"],
    ["Mobility — taxi", "/mobility/taxi"],
    ["Mobility — delivery", "/mobility/delivery"],
    ["Mobility — delivery: bring", "/mobility/delivery/bring"],
    ["Mobility — delivery: parcel", "/mobility/delivery/parcel"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Real-estate / property (public listing pages)
// ---------------------------------------------------------------------------

test.describe("Smoke — Property / real estate (#24)", () => {
  for (const [label, hash] of [
    ["Property public hub", "/property"],
    ["Property hub management", "/property-hub"],
    ["Property search", "/property/search"],
    ["Real-estate analytics Dubai", "/real-estate/dubai-analytics"],
    ["Long-term rentals", "/long-term-rentals"],
    ["Seasonal rentals booking", "/seasonal-rentals-booking"],
    ["Activities booking", "/activities-booking"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// SEO / location pages
// ---------------------------------------------------------------------------

test.describe("Smoke — SEO & location pages (#24)", () => {
  for (const [label, hash] of [
    ["Marketplace services", "/marketplace-services"],
    ["Property owner software", "/property-owner-software"],
    ["Property management platform", "/property-management-platform"],
    ["Rental management software", "/rental-management-software"],
    ["Locations index", "/locations"],
    ["Browse services", "/browse/services"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});

// ---------------------------------------------------------------------------
// Merchant onboarding (public entry points)
// ---------------------------------------------------------------------------

test.describe("Smoke — Merchant public pages (#24)", () => {
  for (const [label, hash] of [
    ["Merchant claim", "/merchant/claim"],
    ["Merchant onboarding", "/merchant/onboarding"],
  ] as const) {
    test(`${label} renders without crash`, async ({ page }) => {
      await assertPublicPage(page, hash);
    });
  }
});
