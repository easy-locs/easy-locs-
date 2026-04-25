/**
 * Smoke tests — Gate 7 (@smoke tag)
 *
 * Runs against the locally-built `vite preview` server (port 4173 in CI).
 * Does NOT require Supabase credentials: when env vars are absent the app
 * renders the EnvDiagnosticScreen, which is a valid non-blank state.
 *
 * These tests verify only the shell: page loads, React mounts, no hard crash.
 */
import { test, expect } from "@playwright/test";

test("root renders without blank screen @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Body must have content — not a blank/white screen
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight).toBeGreaterThan(0);

  // No uncaught JS exceptions that crash the shell
  expect(errors.filter((e) => /ChunkLoadError|SyntaxError/.test(e))).toHaveLength(0);
});

test("login page renders without crash @smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  expect(bodyHeight).toBeGreaterThan(0);

  expect(errors.filter((e) => /ChunkLoadError|SyntaxError/.test(e))).toHaveLength(0);
});

test("JS and CSS assets load without 4xx/5xx @smoke", async ({ page }) => {
  const failedAssets: string[] = [];

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (/\/assets\//.test(url) && status >= 400) {
      failedAssets.push(`${status} ${url}`);
    }
  });

  await page.goto("/", { waitUntil: "load" });

  expect(failedAssets).toHaveLength(0);
});
