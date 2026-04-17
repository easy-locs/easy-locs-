/**
 * #946 — Admin access audit (super-admin path)
 *
 * Acceptance criteria from the task:
 *   "Le compte propriétaire du compte super-admin peut ouvrir les 7 URLs
 *    sans écran Access Denied ni redirection silencieuse vers /dashboard."
 *
 * This spec authenticates as a SUPER-ADMIN account (using dedicated
 * E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PASSWORD env vars so the
 * generic E2E test account, which is intentionally non-admin, is not
 * blocked) and asserts for each of the 7 legacy admin URLs that:
 *
 *   1. The URL never silently redirects to /dashboard.
 *   2. The unified `/admin/control/*` shell renders.
 *   3. The AdminAccessDenied panel is NOT visible.
 *
 * In CI environments without super-admin credentials configured the test
 * skips with a clear message — it never silently passes.
 */
import { test, expect, type Page } from "@playwright/test";

const LEGACY_URLS = [
  { from: "/admin/agents", target: "/admin/control/agents", label: "Agents" },
  { from: "/admin/command-center", target: "/admin/control/command", label: "Command Center" },
  { from: "/admin/approvals", target: "/admin/control/approvals", label: "Approvals" },
  { from: "/admin/autonomy", target: "/admin/control/autonomy", label: "Autonomy" },
  { from: "/admin/control-room", target: "/admin/control/engines", label: "Control Room" },
  { from: "/admin/engine-control-room", target: "/admin/control/engines", label: "Engine Control Room" },
  { from: "/admin/master-control", target: "/admin/control/master", label: "Master Control" },
] as const;

async function loginAsSuperAdmin(page: Page, email: string, password: string) {
  await page.goto("/#/login");
  await page.waitForLoadState("networkidle");

  const passwordTab = page
    .locator(".flex.gap-1.bg-muted\\/50 button")
    .filter({ hasText: /password/i });
  await passwordTab.click();

  await expect(page.locator("#login-email")).toBeVisible({ timeout: 10000 });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator('form button[type="submit"]').click();

  // Wait for the supabase auth token to land in localStorage so subsequent
  // navigations are recognised as authenticated.
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
      { timeout: 15000 },
    )
    .toBe(true);
}

const SUPER_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL;
const SUPER_PASSWORD = process.env.E2E_SUPER_ADMIN_PASSWORD;

test.describe("Admin access — super-admin opens all 7 URLs (#946)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !SUPER_EMAIL || !SUPER_PASSWORD,
      "E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD must be set to verify super-admin access — skipping in environments without admin credentials.",
    );
    await loginAsSuperAdmin(page, SUPER_EMAIL!, SUPER_PASSWORD!);
  });

  for (const { from, target, label } of LEGACY_URLS) {
    test(`${label} (${from}) → ${target} loads the shell with no denial`, async ({ page }) => {
      await page.goto(`/#${from}`);
      await page.waitForLoadState("networkidle");

      const url = new URL(page.url());
      const hashPath = url.hash.replace(/^#/, "") || url.pathname;

      // 1. Never silently redirect to /dashboard.
      expect(
        hashPath,
        `Expected to land on ${target} but ended up on ${hashPath}`,
      ).not.toMatch(/^\/dashboard(\b|$)/);

      // 2. URL must be the canonical /admin/control/* destination.
      expect(hashPath.startsWith(target)).toBeTruthy();

      // 3. Shell renders.
      await expect(
        page.locator('[data-testid="admin-control-shell"]'),
      ).toBeVisible({ timeout: 15000 });

      // 4. No AdminAccessDenied panel.
      await expect(
        page.locator('[data-testid="admin-access-denied"]'),
      ).toHaveCount(0);
    });
  }
});
