import { test, expect } from "@playwright/test";
import {
  attachRuntimeRecorders,
  expectNoErrorBoundary,
  waitForRouteSettled,
} from "./execution/_helpers";

/**
 * Route Armada — @armada
 *
 * Visits every key route discovered from the route inventory.
 * For each route (from public landing through protected pillars):
 *   - direct navigation
 *   - hard refresh (page.reload)
 *   - body.scrollHeight > 0
 *   - React mounted flag (when not a redirect)
 *   - no uncaught JS crash
 *   - no failed JS/CSS assets
 *   - no CSP violation
 *   - no error boundary
 *   - splash disappears OR EnvDiagnosticScreen appears (not stuck)
 *   - protected routes either render OR redirect cleanly (no loop)
 *   - no Cloudflare 404 page
 *
 * Grouped in phases so the runtime config's project+grep selectors apply.
 * Runs against BASE_URL (CF Pages preview URL when available, localhost otherwise).
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maximum ms to wait for splash to disappear or React to mount */
const SPLASH_TIMEOUT = 8_000;

/**
 * Core atomic check applied to every route.
 * Returns an object describing pass/fail for each criterion.
 */
async function checkRoute(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  route: string,
  opts: { expectAuth?: boolean; expectRedirect?: string } = {}
) {
  const failedAssets: string[] = [];
  const cspViolations: string[] = [];
  const rec = attachRuntimeRecorders(page);

  // Track failed asset loads
  page.on("response", (resp) => {
    const url = resp.url();
    if (resp.status() >= 400 && /\.(js|css|woff2?|png|jpg|svg)(\?|$)/.test(url)) {
      failedAssets.push(`${resp.status()} ${url}`);
    }
  });

  // Track CSP violations via console
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content.Security.Policy|CSP/.test(msg.text())) {
      cspViolations.push(msg.text());
    }
  });

  // Navigate
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForRouteSettled(page);

  // No Cloudflare 404 page
  const pageTitle = await page.title();
  const isCF404 = pageTitle.includes("404") && pageTitle.toLowerCase().includes("cloudflare");
  expect(isCF404, `CF 404 page at ${route}: "${pageTitle}"`).toBe(false);

  // body.scrollHeight > 0
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, `body.scrollHeight should be > 0 at ${route}`).toBeGreaterThan(0);

  // No error boundary
  await expectNoErrorBoundary(page);

  // Splash gone or diagnostic screen within timeout
  try {
    await page.waitForFunction(() => {
      const splash = document.getElementById("splash") || document.querySelector('[data-testid="splash"]');
      if (!splash) return true;
      const style = window.getComputedStyle(splash);
      return style.display === "none" || style.opacity === "0" || style.visibility === "hidden";
    }, { timeout: SPLASH_TIMEOUT });
  } catch {
    // If splash never disappears, check if diagnostic screen is showing (acceptable)
    const hasDiag = await page.locator('[data-testid="env-diagnostic"], .env-diagnostic').count();
    if (hasDiag === 0) {
      // Splash stuck AND no diagnostic — that's a real failure
      expect(false, `Splash still visible at ${route} after ${SPLASH_TIMEOUT}ms`).toBe(true);
    }
  }

  // React mounted (when not expected to redirect)
  if (!opts.expectRedirect) {
    try {
      const reactMounted = await page.evaluate(
        () => (window as unknown as { __EASYLOCS_REACT_MOUNTED__?: boolean }).__EASYLOCS_REACT_MOUNTED__
      );
      // Not mandatory (may not be set in all modes) but log if missing
      if (!reactMounted) {
        // Check body has real content as fallback signal
        const hasContent = await page.locator("body > *").count();
        expect(hasContent, `React not mounted and no DOM content at ${route}`).toBeGreaterThan(0);
      }
    } catch {
      // evaluate failed — page may have navigated; not fatal here
    }
  }

  // No uncaught JS crash
  expect(rec.pageErrors, `pageErrors at ${route}: ${rec.pageErrors.join(" | ")}`).toHaveLength(0);

  // No failed JS/CSS assets
  expect(failedAssets, `Failed assets at ${route}: ${failedAssets.join(", ")}`).toHaveLength(0);

  // No CSP violations
  expect(cspViolations, `CSP violations at ${route}: ${cspViolations.join(" | ")}`).toHaveLength(0);

  return { route, bodyHeight, pageTitle, rec };
}

/**
 * Hard-refresh check — navigates then reloads the page.
 * Verifies the server returns a real HTML document (not CF 404) on reload.
 */
async function checkHardRefresh(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  route: string
) {
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight, `body.scrollHeight > 0 after hard refresh at ${route}`).toBeGreaterThan(0);

  const isCF404 = (await page.title()).toLowerCase().includes("404") &&
    (await page.content()).includes("Cloudflare");
  expect(isCF404, `CF 404 page after hard refresh at ${route}`).toBe(false);
}

// ─── Phase 1 — Public routes ──────────────────────────────────────────────────

test.describe("@armada @phase1 Public routes", () => {
  const publicRoutes = ["/", "/login", "/signup", "/radar", "/radar/explore", "/about", "/terms", "/privacy", "/install"];

  for (const route of publicRoutes) {
    test(`${route} — direct navigation`, async ({ page }) => {
      await checkRoute(page, route);
    });

    test(`${route} — hard refresh`, async ({ page }) => {
      await checkHardRefresh(page, route);
    });
  }
});

// ─── Phase 1 — Mobile viewport ────────────────────────────────────────────────

test.describe("@armada @phase4 Public routes mobile", () => {
  const mobileRoutes = ["/", "/login", "/radar"];

  for (const route of mobileRoutes) {
    test(`${route} mobile — no black screen`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      const page = await ctx.newPage();
      await checkRoute(page, route);
      await ctx.close();
    });
  }
});

// ─── Phase 2 — Protected pillar stubs (expect redirect to /login) ─────────────

test.describe("@armada @phase2 Protected pillars (unauthenticated)", () => {
  const protectedRoutes = [
    "/dashboard",
    "/orbit",
    "/wallet",
    "/me",
    "/admin",
    "/driver/dashboard",
    "/merchant/dashboard",
    "/pro",
    "/settings",
  ];

  for (const route of protectedRoutes) {
    test(`${route} — redirects to /login or renders without crash`, async ({ page }) => {
      const navUrls: string[] = [];
      page.on("framenavigated", (f) => { if (f === page.mainFrame()) navUrls.push(f.url()); });

      const rec = attachRuntimeRecorders(page);
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await waitForRouteSettled(page);

      // Must not be a redirect loop
      const unique = [...new Set(navUrls)];
      expect(unique.length, `Redirect loop at ${route}: ${navUrls.join(" → ")}`).toBeLessThanOrEqual(4);

      // Either on /login or still on the route (rendered for logged-in users)
      const finalUrl = page.url();
      const isOnLogin = /\/login/.test(finalUrl);
      const isOnOriginal = finalUrl.includes(route.replace(/^\//, ""));
      expect(
        isOnLogin || isOnOriginal,
        `Unexpected URL after ${route}: ${finalUrl}`
      ).toBe(true);

      // No uncaught crash regardless
      expect(rec.pageErrors, `pageErrors at ${route}: ${rec.pageErrors.join(" | ")}`).toHaveLength(0);
      await expectNoErrorBoundary(page);
    });

    test(`${route} — hard refresh doesn't return CF 404`, async ({ page }) => {
      await checkHardRefresh(page, route);
    });
  }
});

// ─── Phase 2 — Orbit routes ───────────────────────────────────────────────────

test.describe("@armada @phase2 Orbit routes", () => {
  const orbitRoutes = [
    "/orbit",
    "/orbit/contacts",
    "/orbit/add",
    "/orbit/identity",
    "/orbit/support",
  ];

  for (const route of orbitRoutes) {
    test(`${route} — hard refresh`, async ({ page }) => {
      await checkHardRefresh(page, route);
    });
  }
});

// ─── Phase 2 — Wallet routes ──────────────────────────────────────────────────

test.describe("@armada @phase2 Wallet routes", () => {
  const walletRoutes = [
    "/wallet",
    "/wallet/top-up",
    "/wallet/transfer",
    "/wallet/request",
    "/wallet/forex",
    "/wallet/virtual-cards",
    "/wallet/installments",
    "/checkout",
    "/pos",
  ];

  for (const route of walletRoutes) {
    test(`${route} — hard refresh`, async ({ page }) => {
      await checkHardRefresh(page, route);
    });
  }
});

// ─── Phase 2 — Me routes ──────────────────────────────────────────────────────

test.describe("@armada @phase2 Me routes", () => {
  const meRoutes = [
    "/me",
    "/me/edit-profile",
    "/me/spending-insights",
    "/me/address-book",
    "/me/referral",
    "/settings",
  ];

  for (const route of meRoutes) {
    test(`${route} — hard refresh`, async ({ page }) => {
      await checkHardRefresh(page, route);
    });
  }
});

// ─── Phase 3 — Edge/stress checks ────────────────────────────────────────────

test.describe("@armada @phase3 Edge cases", () => {
  test("unknown route returns 404 page not CF error", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz-42", { waitUntil: "domcontentloaded" });
    const content = await page.content();
    // Must serve index.html (SPA), not Cloudflare's own 404
    expect(content).not.toContain("cloudflare-error-1000");
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(bodyHeight).toBeGreaterThan(0);
  });

  test("route with param renders without crash (/radar/shop/test-id)", async ({ page }) => {
    const rec = attachRuntimeRecorders(page);
    await page.goto("/radar/shop/nonexistent-shop-test", { waitUntil: "domcontentloaded" });
    await waitForRouteSettled(page);
    expect(rec.pageErrors).toHaveLength(0);
    await expectNoErrorBoundary(page);
  });

  test("deeplink route hard refresh", async ({ page }) => {
    await checkHardRefresh(page, "/dl/invite/test");
  });

  test("legal routes hard refresh", async ({ page }) => {
    for (const route of ["/terms", "/privacy", "/about", "/contact", "/help"]) {
      await checkHardRefresh(page, route);
    }
  });

  test("auth callback route handles gracefully", async ({ page }) => {
    const rec = attachRuntimeRecorders(page);
    await page.goto("/auth/callback", { waitUntil: "domcontentloaded" });
    await waitForRouteSettled(page);
    // Should not crash even without valid auth params
    expect(rec.pageErrors).toHaveLength(0);
  });
});

// ─── Phase 5 — Radar sub-routes ───────────────────────────────────────────────

test.describe("@armada @phase5 Radar discovery routes", () => {
  const radarRoutes = [
    "/radar",
    "/radar/explore",
    "/radar/discover",
    "/radar/mobility",
    "/radar/travel",
    "/radar/food",
    "/radar/properties",
  ];

  for (const route of radarRoutes) {
    test(`${route} — navigates without crash`, async ({ page }) => {
      const rec = attachRuntimeRecorders(page);
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await waitForRouteSettled(page);
      expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(bodyHeight).toBeGreaterThan(0);
    });
  }
});
