/**
 * #23 — Copilot / AI-assistant routes
 *
 * Verifies that every AI/copilot surface in the app mounts without a runtime
 * crash, does not redirect to /login, and does not show a raw error page.
 *
 * Two categories are covered:
 *   • User-facing copilot  → /dashboard/ai  (AIAssistant)
 *   • Admin copilot panel  → /admin/ai-control-center  (AdminAIControlCenter)
 *
 * The admin route requires a super-admin session; the dashboard route requires
 * any authenticated session.  When super-admin credentials are available they
 * are used for both, otherwise the regular test account is used for the
 * dashboard route and the admin route is skipped.
 *
 * Skips gracefully when no credentials are configured (fork PRs, etc.).
 */
import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/#/login");
  await page.waitForLoadState("networkidle");

  const passwordTab = page
    .locator(".flex.gap-1.bg-muted\\/50 button")
    .filter({ hasText: /password/i });
  await passwordTab.click();

  await expect(page.locator("#login-email")).toBeVisible({ timeout: 10_000 });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator('form button[type="submit"]').click();

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const key = Object.keys(localStorage).find(
            (k) => k.includes("supabase") && k.includes("auth"),
          );
          if (!key) return false;
          try {
            const val = JSON.parse(localStorage.getItem(key) || "{}");
            return !!val.access_token;
          } catch {
            return false;
          }
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
}

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const SUPER_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL;
const SUPER_PASSWORD = process.env.E2E_SUPER_ADMIN_PASSWORD;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

// Prefer super-admin for full access; fall back to regular account.
const AUTH_EMAIL = SUPER_EMAIL ?? TEST_EMAIL;
const AUTH_PASSWORD = SUPER_PASSWORD ?? TEST_PASSWORD;

// ---------------------------------------------------------------------------
// Shared assertion — page loaded without crash and is not an error/login page
// ---------------------------------------------------------------------------

async function assertPageLoaded(page: Page, expectedPathPrefix: string) {
  const url = new URL(page.url());
  const hashPath = url.hash.replace(/^#/, "") || url.pathname;

  // Must not be kicked to the login screen.
  expect(
    hashPath,
    `Copilot route unexpectedly redirected to ${hashPath}`,
  ).not.toMatch(/^\/login(\b|$)/);

  // Body must not show a generic hard-error message.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/404|page not found|something went wrong/i);

  // Must stay on the expected path (or a sub-path of it).
  expect(
    hashPath,
    `Expected path starting with ${expectedPathPrefix}, got ${hashPath}`,
  ).toMatch(new RegExp(`^${expectedPathPrefix.replace(/\//g, "\\/")}`));
}

// ---------------------------------------------------------------------------
// Suite 1 — User-facing AI copilot  (/dashboard/ai)
// ---------------------------------------------------------------------------

test.describe("Copilot — AI Assistant dashboard (/dashboard/ai) (#23)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !AUTH_EMAIL || !AUTH_PASSWORD,
      "E2E_TEST_EMAIL (or E2E_SUPER_ADMIN_EMAIL) and its password must be set — skipping.",
    );
    await loginAs(page, AUTH_EMAIL!, AUTH_PASSWORD!);
  });

  test("AI Assistant page renders without crash", async ({ page }) => {
    await page.goto("/#/dashboard/ai");
    await page.waitForLoadState("networkidle");

    await assertPageLoaded(page, "/dashboard/ai");

    // The AI assistant renders at least one interactive element.
    const hasContent = await page
      .locator("main, [role='main'], [data-testid='ai-assistant'], textarea, input[type='text']")
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      hasContent,
      "AI assistant page loaded but no recognizable content element was visible",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Admin AI control center  (/admin/ai-control-center)
// ---------------------------------------------------------------------------

test.describe("Copilot — Admin AI Control Center (/admin/ai-control-center) (#23)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !SUPER_EMAIL || !SUPER_PASSWORD,
      "E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD must be set to access the admin AI panel — skipping.",
    );
    await loginAs(page, SUPER_EMAIL!, SUPER_PASSWORD!);
  });

  test("Admin AI Control Center renders without crash", async ({ page }) => {
    await page.goto("/#/admin/ai-control-center");
    await page.waitForLoadState("networkidle");

    await assertPageLoaded(page, "/admin/ai-control-center");

    // Admin shell or page content must be visible.
    const hasContent = await page
      .locator("main, [role='main'], [data-testid='admin-ai-control-center']")
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      hasContent,
      "Admin AI control center page loaded but no recognizable content was visible",
    ).toBe(true);
  });
});
