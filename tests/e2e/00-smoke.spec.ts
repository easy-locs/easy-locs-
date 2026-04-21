/**
 * 00-smoke — Big-Tech deploy gate smoke tests.
 *
 * Visits every required pillar route as an anonymous (credential-free) user
 * and asserts against all 7 catastrophic failure modes:
 *
 *   1. Stuck boot splash > 10 s
 *   2. "Taking too long? Reset & retry" visible
 *   3. "Erreur de démarrage" visible
 *   4. Blank screen (rendered HTML < 500 chars)
 *   5. Uncaught JS pageerror
 *   6. Fatal console error (TypeError / ReferenceError / SyntaxError / Uncaught)
 *   7. Failed JS or CSS asset (4xx / 5xx response or request-failed)
 *
 * Auth-guarded routes are expected to redirect to /login — that is a sane
 * outcome and is accepted. The gate only fails on the catastrophic conditions
 * listed above.
 */

import { test, expect } from '@playwright/test';

/** All pillar routes required by the deploy gate. */
const ROUTES = ['/', '/login', '/dashboard', '/orbit', '/wallet', '/radar', '/admin'];

/** Text strings whose presence in the page body is an unconditional failure. */
const FATAL_STRINGS: string[] = ['Taking too long? Reset', 'Erreur de démarrage'];

/**
 * Minimum rendered HTML length considered a non-blank page.
 * A normal SPA index.html with the React root div is ~600–2000 bytes;
 * anything below 500 means the renderer produced virtually nothing.
 */
const MIN_RENDERED_HTML_LENGTH = 500;

test.describe('smoke: pillar routes — deploy gate', () => {
  for (const route of ROUTES) {
    test(`${route} renders without fatal failure`, async ({ page }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedAssets: string[] = [];

      // ── Listeners installed before navigation ────────────────────────────
      page.on('pageerror', (err) => pageErrors.push(String(err)));

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Only track JS/CSS assets — not API 4xx (e.g. unauthenticated Supabase
      // requests), which are expected when running without credentials.
      page.on('requestfailed', (req) => {
        const url = req.url();
        if (/\.(js|css)(\?|$)/i.test(url)) {
          failedAssets.push(`FAILED ${url}`);
        }
      });

      page.on('response', (resp) => {
        const url = resp.url();
        if (/\.(js|css)(\?|$)/i.test(url) && resp.status() >= 400) {
          failedAssets.push(`HTTP ${resp.status()} ${url}`);
        }
      });

      // ── Navigation ───────────────────────────────────────────────────────
      // 'load' waits for the window load event (JS parsed + critical assets
      // fetched), which is required to detect failed JS/CSS and pageerrors
      // that fire during module evaluation.
      await page.goto(route, { waitUntil: 'load', timeout: 30_000 });

      // ── Check 1: Boot splash must not be stuck for more than 10 s ────────
      // Matches common splash/loading-screen patterns used in the app.
      const splash = page.locator(
        [
          '[data-testid="boot-splash"]',
          '[data-testid="splash"]',
          '#splash',
          '.splash-screen',
          '[class*="SplashScreen"]',
          '[class*="splash-screen"]',
          '[aria-label="Loading application"]',
          '[role="progressbar"][aria-label*="boot" i]',
        ].join(', '),
      );

      if ((await splash.count()) > 0) {
        await expect(
          splash.first(),
          `boot splash stuck on ${route} — did not disappear within 10 s`,
        ).toBeHidden({ timeout: 10_000 });
      }

      // ── Page must have settled ────────────────────────────────────────────
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

      const html = await page.content();
      const bodyText = await page.evaluate(() => document.body.innerText ?? '');

      // ── Check 2 & 3: Fatal text strings ──────────────────────────────────
      for (const str of FATAL_STRINGS) {
        expect(
          bodyText,
          `fatal string "${str}" found on ${route}`,
        ).not.toContain(str);
      }

      // ── Check 4: Not a blank screen ───────────────────────────────────────
      expect(html.length, `blank page on ${route}`).toBeGreaterThan(MIN_RENDERED_HTML_LENGTH);

      // ── Check 5: No uncaught pageerrors ───────────────────────────────────
      expect(pageErrors, `uncaught pageerror on ${route}`).toEqual([]);

      // ── Check 6: No fatal console errors ─────────────────────────────────
      const fatalConsole = consoleErrors.filter((e) =>
        /TypeError|ReferenceError|SyntaxError|Uncaught/i.test(e),
      );
      expect(fatalConsole, `fatal console error on ${route}`).toEqual([]);

      // ── Check 7: No failed JS / CSS assets ───────────────────────────────
      expect(failedAssets, `failed JS/CSS asset on ${route}`).toEqual([]);
    });
  }
});
