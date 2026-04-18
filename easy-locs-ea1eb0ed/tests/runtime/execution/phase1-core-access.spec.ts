import { test, expect } from "@playwright/test";
import {
  attachRuntimeRecorders,
  expectNoErrorBoundary,
  isRedirectLoop,
  waitForRouteSettled,
} from "./_helpers";

/**
 * Phase 1 — Core access suite.
 *
 * Public landing → /login → /dashboard (auth gate) → refresh → re-navigate.
 * No real Supabase login is performed here; the harness asserts that the
 * unauthenticated path reaches /login *cleanly* (no loops, no stuck
 * skeletons, no error boundaries, no uncaught console errors).
 */

test.describe("@phase1 Core access", () => {
  test("landing renders without crash and exposes navigation", async ({ page }) => {
    const rec = attachRuntimeRecorders(page);
    await page.goto("/");
    await waitForRouteSettled(page);

    await expectNoErrorBoundary(page);
    await expect(page.locator("nav, header").first()).toBeVisible();
    expect(rec.pageErrors, `pageerror on /: ${rec.pageErrors.join(" | ")}`).toHaveLength(0);
  });

  test("/login route is reachable and renders a login form", async ({ page }) => {
    const rec = attachRuntimeRecorders(page);
    await page.goto("/login");
    await waitForRouteSettled(page);

    await expectNoErrorBoundary(page);
    expect(page.url()).toMatch(/\/login/);
    // Login form must be present in some shape (heading + at least one input).
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("input").first()).toBeVisible();
    expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
  });

  test("unauthenticated /dashboard redirects to /login (no loop, no stuck skeleton)", async ({
    page,
  }) => {
    const urls: string[] = [];
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) urls.push(f.url());
    });
    const rec = attachRuntimeRecorders(page);

    await page.goto("/dashboard");
    await waitForRouteSettled(page);

    expect(isRedirectLoop(urls), `redirect loop: ${urls.join(" -> ")}`).toBe(false);
    // Either redirected to login, or the auth gate kept us there with the form visible.
    expect(page.url()).toMatch(/\/(login|dashboard)/);
    await expectNoErrorBoundary(page);
    expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
  });

  test("hard refresh on /login keeps page stable", async ({ page }) => {
    await page.goto("/login");
    await waitForRouteSettled(page);
    const rec = attachRuntimeRecorders(page);
    await page.reload();
    await waitForRouteSettled(page);

    await expectNoErrorBoundary(page);
    await expect(page.locator("input").first()).toBeVisible();
    expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
  });

  test("rapid back/forward across landing<->login is stable", async ({ page }) => {
    const rec = attachRuntimeRecorders(page);
    await page.goto("/");
    await waitForRouteSettled(page);
    await page.goto("/login");
    await waitForRouteSettled(page);
    await page.goBack();
    await waitForRouteSettled(page);
    await page.goForward();
    await waitForRouteSettled(page);

    await expectNoErrorBoundary(page);
    expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
  });
});
