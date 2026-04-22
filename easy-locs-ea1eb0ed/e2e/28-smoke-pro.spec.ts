/**
 * #28 — Smoke: Pro portal
 *
 * Logs in as the standard E2E test user and visits every sub-route of the
 * unified /pro shell.  Each test asserts:
 *   1. No redirect to /login after authentication.
 *   2. No hard error boundary / crash screen.
 *
 * The Pro routes use a nested layout (ProShell), so a crash in any child
 * would surface as a react error boundary or a blank body.
 */
import { test as authTest, expect } from "./fixtures/base.fixture";

async function assertPage(
  page: import("@playwright/test").Page,
  hash: string,
) {
  await page.goto(`/#${hash}`);
  await page.waitForLoadState("networkidle");

  const url = new URL(page.url());
  const hashPath = url.hash.replace(/^#/, "") || url.pathname;

  expect(hashPath, `Pro route ${hash} redirected to login`).not.toMatch(
    /^\/login(\b|$)/,
  );

  await expect(
    page.locator('[data-testid="error-fallback"], .error-boundary'),
  ).toHaveCount(0);
}

authTest.describe("Smoke — Pro portal (#28)", () => {
  for (const [label, hash] of [
    ["Pro shell root", "/pro"],
    ["Pro onboarding", "/pro/onboarding"],
    ["Pro profile", "/pro/profile"],
    ["Pro media", "/pro/media"],
    ["Pro catalog", "/pro/catalog"],
    ["Pro availability", "/pro/availability"],
    ["Pro pricing", "/pro/pricing"],
    ["Pro orders", "/pro/orders"],
    ["Pro inbox", "/pro/inbox"],
    ["Pro reviews", "/pro/reviews"],
    ["Pro wallet", "/pro/wallet"],
    ["Pro team", "/pro/team"],
    ["Pro analytics", "/pro/analytics"],
    ["Pro live monitor", "/pro/monitor"],
    ["Pro settings", "/pro/settings"],
    ["Pro compliance", "/pro/compliance"],
  ] as const) {
    authTest(`${label} renders without crash`, async ({ authenticatedPage: page }) => {
      await assertPage(page, hash);
    });
  }
});
