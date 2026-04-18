/**
 * Task #998 — Army Hierarchy E2E
 *
 * Smoke coverage of the Army Cockpit. Skipped automatically when the
 * required env (Supreme login + Supabase URL) is not configured. Full
 * scenarios are in docs/audits/army-hierarchy.md.
 */
import { test, expect } from "@playwright/test";

const SUPREME_EMAIL = process.env.E2E_SUPREME_EMAIL;
const SUPREME_PWD = process.env.E2E_SUPREME_PASSWORD;

test.describe("Army Cockpit", () => {
  test.skip(!SUPREME_EMAIL || !SUPREME_PWD, "supreme credentials not configured");

  test("S1 — issue a normal order and watch it travel the chain", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', SUPREME_EMAIL!);
    await page.fill('input[type="password"]', SUPREME_PWD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    await page.goto("/dashboard/army");
    await expect(page.getByRole("heading", { name: /Army Cockpit/i })).toBeVisible();

    const title = `e2e order ${Date.now()}`;
    await page.getByPlaceholder(/audit security/i).fill(title);
    await page.getByRole("button", { name: /Dispatch/ }).click();

    // Order should appear and end up "completed" within a couple of ticks.
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(title).locator("..")
                       .getByText(/completed|running|dispatching/)).toBeVisible({ timeout: 90_000 });
  });

  test("S2 — critical order pauses for approval", async ({ page }) => {
    await page.goto("/dashboard/army");
    const title = `e2e critical ${Date.now()}`;
    await page.getByPlaceholder(/audit security/i).fill(title);
    // Risk select is the second select in the form
    const selects = page.locator('button[role="combobox"]');
    await selects.nth(1).click();
    await page.getByRole("option", { name: /risk: critical/ }).click();
    await page.getByRole("button", { name: /Dispatch/ }).click();

    // The Approve button should appear next to one of the new tasks.
    await expect(page.getByRole("button", { name: /^Approve$/ })
                       .first()).toBeVisible({ timeout: 60_000 });
  });

  test("S4 — KILL ARMY blocks new execution", async ({ page }) => {
    await page.goto("/dashboard/army");
    page.once("dialog", (d) => d.accept());
    page.once("dialog", (d) => d.accept());
    page.once("dialog", (d) => d.accept("e2e drill"));
    await page.getByRole("button", { name: /KILL ARMY/ }).click();

    await expect(page.getByText(/kill switch is ACTIVE/i))
      .toBeVisible({ timeout: 10_000 });

    // Revive so subsequent tests aren't poisoned.
    await page.getByRole("button", { name: /Revive Army/ }).click();
    await expect(page.getByRole("button", { name: /KILL ARMY/ }))
      .toBeVisible({ timeout: 10_000 });
  });
});
