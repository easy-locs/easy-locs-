import { test, expect, type Page } from "@playwright/test";

const SUPER_EMAIL = process.env.E2E_SUPER_ADMIN_EMAIL;
const SUPER_PASSWORD = process.env.E2E_SUPER_ADMIN_PASSWORD;

/** All sections defined in src/pages/admin/control/sections.ts */
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

async function loginAsSuperAdmin(page: Page) {
  await page.goto("/#/login");
  await page.waitForLoadState("networkidle");

  const passwordTab = page
    .locator(".flex.gap-1.bg-muted\\/50 button")
    .filter({ hasText: /password/i });
  await passwordTab.click();

  await expect(page.locator("#login-email")).toBeVisible({ timeout: 10_000 });
  await page.locator("#login-email").fill(SUPER_EMAIL!);
  await page.locator("#login-password").fill(SUPER_PASSWORD!);
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

test.describe("admin control plane — all sections", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !SUPER_EMAIL || !SUPER_PASSWORD,
      "E2E_SUPER_ADMIN_EMAIL and E2E_SUPER_ADMIN_PASSWORD must be set to run admin control plane tests — skipping.",
    );
    await loginAsSuperAdmin(page);
  });

  for (const { id, label } of CONTROL_SECTIONS) {
    test(`${label} (/admin/control/${id}) renders without crashing`, async ({ page }) => {
      await page.goto(`/#/admin/control/${id}`);
      await page.waitForLoadState("networkidle");

      const url = new URL(page.url());
      const hashPath = url.hash.replace(/^#/, "") || url.pathname;

      // Must not be silently redirected to /dashboard.
      expect(
        hashPath,
        `Expected to stay in /admin/control but ended up on ${hashPath}`,
      ).not.toMatch(/^\/dashboard(\b|$)/);

      // Shell must be visible.
      await expect(
        page.locator("[data-testid='admin-control-shell']"),
      ).toBeVisible({ timeout: 15_000 });

      // No access-denied overlay.
      await expect(
        page.locator("[data-testid='admin-access-denied']"),
      ).toHaveCount(0);
    });
  }
});
