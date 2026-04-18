import { test, expect } from "@playwright/test";
import {
  attachRuntimeRecorders,
  expectNoErrorBoundary,
  waitForRouteSettled,
} from "./_helpers";

/**
 * Phase 2 — Primary user flows suite.
 *
 * Walks the canonical "every user touches it" routes. Auth-gated routes
 * are *expected* to redirect to /login when no session exists; the audit
 * only fails if the route crashes, hangs on a skeleton, or emits a
 * pageerror / error boundary.
 */

const PRIMARY_ROUTES: { name: string; path: string; mayRedirectToLogin?: boolean }[] = [
  { name: "dashboard", path: "/dashboard", mayRedirectToLogin: true },
  { name: "wallet", path: "/wallet", mayRedirectToLogin: true },
  { name: "orders", path: "/orders", mayRedirectToLogin: true },
  { name: "my-orders", path: "/my-orders", mayRedirectToLogin: true },
  { name: "orbit", path: "/orbit", mayRedirectToLogin: true },
  { name: "notifications", path: "/notifications", mayRedirectToLogin: true },
  { name: "favorites", path: "/favorites", mayRedirectToLogin: true },
  { name: "me", path: "/me", mayRedirectToLogin: true },
  { name: "me-edit-profile", path: "/me/edit-profile", mayRedirectToLogin: true },
  { name: "browse-food", path: "/browse/food" },
  { name: "browse-grocery", path: "/browse/grocery" },
  { name: "stay", path: "/stay" },
  { name: "mobility", path: "/mobility" },
  { name: "mobility-taxi", path: "/mobility/taxi" },
];

for (const route of PRIMARY_ROUTES) {
  test(`@phase2 ${route.name} (${route.path}) renders without runtime defect`, async ({ page }) => {
    const rec = attachRuntimeRecorders(page);
    await page.goto(route.path);
    await waitForRouteSettled(page);

    await expectNoErrorBoundary(page);
    if (!route.mayRedirectToLogin) {
      expect(page.url(), `unexpected redirect for public route ${route.path}`).not.toMatch(
        /\/login/,
      );
    }
    // Content must exist — not just a blank page.
    const bodyText = (await page.locator("body").innerText()) ?? "";
    expect(bodyText.trim().length, `blank body on ${route.path}`).toBeGreaterThan(20);

    expect(
      rec.pageErrors,
      `pageerror on ${route.path}: ${rec.pageErrors.join(" | ")}`,
    ).toHaveLength(0);
  });
}

test("@phase2 navigating across primary routes does not leave stale state", async ({
  page,
}) => {
  const rec = attachRuntimeRecorders(page);
  for (const r of PRIMARY_ROUTES.slice(0, 6)) {
    await page.goto(r.path);
    await waitForRouteSettled(page);
    await expectNoErrorBoundary(page);
  }
  expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
});
