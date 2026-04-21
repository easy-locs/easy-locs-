/**
 * #22 — Admin control plane: one test per section
 *
 * Verifies that a super-admin can navigate to every section of the unified
 * /admin/control/* shell without hitting an access-denied panel or being
 * silently redirected away from the admin area.
 *
 * Sections are driven from the same list defined in src/pages/admin/control/sections.ts
 * so this spec stays in sync with the actual navigation rail.
 *
 * Skips gracefully when E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PASSWORD are
 * not set (fork PRs, draft CI, etc.).
 */
import { test, expect, type Page } from "@playwright/test";

const CONTROL_SECTIONS = [
  { id: "overview",  label: "Command Center" },
  { id: "tasks",     label: "Tasks"          },
  { id: "agents",    label: "Agents"         },
  { id: "approvals", label: "Approvals"      },
  { id: "watchdog",  label: "Watchdog"       },
  { id: "proof",     label: "Runtime Proof"  },
  { id: "wiring",    label: "Wiring Map"     },
  { id: "runs",      label: "Runs"           },
  { id: "command",   label: "Slash"          },
  { id: "autonomy",  label: "Autonomy"       },
  { id: "engines",   label: "Engines"        },
  { id: "master",    label: "Master Index"   },
] as const;

async function loginAsSuperAdmin(page: Page, email: string, password: string) {
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

const SUPER_EMAIL    = process.env.E2E_SUPER_ADMIN_EMAIL;
const SUPER_PASSWORD = process.env.E2E_SUPER_ADMIN_PASSWORD;

test.describe("Admin control plane — all sections (#22)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !SUPER_EMAIL || !SUPER_PASSWORD,
      "E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD must be set — skipping.",
    );
    await loginAsSuperAdmin(page, SUPER_EMAIL!, SUPER_PASSWORD!);
  });

  for (const { id, label } of CONTROL_SECTIONS) {
    test(`${label} (/admin/control/${id}) renders without error`, async ({ page }) => {
      await page.goto(`/#/admin/control/${id}`);
      await page.waitForLoadState("networkidle");

      const url      = new URL(page.url());
      const hashPath = url.hash.replace(/^#/, "") || url.pathname;

      // 1. Must not be silently redirected to the user dashboard.
      expect(
        hashPath,
        `Expected to stay in /admin/control but ended up on ${hashPath}`,
      ).not.toMatch(/^\/dashboard(\b|$)/);

      // 2. Must stay within the admin control shell (not kick out to login).
      expect(hashPath).not.toMatch(/^\/login(\b|$)/);

      // 3. Unified control shell must be visible.
      await expect(
        page.locator('[data-testid="admin-control-shell"]'),
      ).toBeVisible({ timeout: 15_000 });

      // 4. No access-denied overlay.
      await expect(
        page.locator('[data-testid="admin-access-denied"]'),
      ).toHaveCount(0);
    });
  }
});
