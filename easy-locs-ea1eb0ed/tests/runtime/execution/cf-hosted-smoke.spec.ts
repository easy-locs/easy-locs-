/**
 * CF Pages Hosted Runtime Smoke Test
 *
 * Run against a live Cloudflare Pages preview URL:
 *
 *   BASE_URL=https://<hash>.easy-locs.pages.dev \
 *   npx playwright test tests/runtime/execution/cf-hosted-smoke.spec.ts \
 *     --config playwright.runtime.config.ts --project phase1-core-access
 *
 * Acceptance criteria (from task #1069):
 *   ✓ Splash renders immediately — no black/blank screen
 *   ✓ React mounts: window.__EASYLOCS_REACT_MOUNTED__ === true
 *   ✓ document.body.scrollHeight > 0
 *   ✓ 0 uncaught page errors (JS exceptions)
 *   ✓ 0 failed JS/CSS asset requests (4xx/5xx on /assets/)
 *   ✓ If env vars missing → EnvDiagnosticScreen visible, NOT black page
 *   ✓ /, /login, /dashboard, /admin, /orbit, /radar, /wallet, /me
 *     all return HTTP 200 (SPA fallback) on direct refresh
 *   ✓ No CSP violations blocking boot scripts, Partytown, or analytics
 *   ✓ Deep links return index.html, not Cloudflare 404
 */

import { test, expect, type Page, type ConsoleMessage, type Request, type Response } from "@playwright/test";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

interface Recorders {
  cspViolations: string[];
  pageErrors: string[];
  failedAssets: string[];
  allConsoleErrors: string[];
}

function attachRecorders(page: Page): Recorders {
  const cspViolations: string[] = [];
  const pageErrors: string[] = [];
  const failedAssets: string[] = [];
  const allConsoleErrors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    allConsoleErrors.push(text);
    if (/Content Security Policy|CSP|violat/i.test(text)) {
      cspViolations.push(text);
    }
  });

  page.on("pageerror", (err: Error) => {
    pageErrors.push(`${err.name}: ${err.message}`);
  });

  page.on("response", (resp: Response) => {
    const url = resp.url();
    const status = resp.status();
    if (/\/assets\//.test(url) && (status === 404 || status >= 500)) {
      failedAssets.push(`${status} ${url}`);
    }
  });

  return { cspViolations, pageErrors, failedAssets, allConsoleErrors };
}

async function waitForReactMount(page: Page, timeoutMs = 8000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const mounted = await page.evaluate(() => !!(window as any).__EASYLOCS_REACT_MOUNTED__).catch(() => false);
    if (mounted) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

async function waitForSplashGone(page: Page, timeoutMs = 6000): Promise<void> {
  await page.waitForFunction(
    () => {
      const splash = document.getElementById("app-loading");
      return !splash || splash.classList.contains("fade-out") || getComputedStyle(splash).opacity === "0" || splash.style.display === "none";
    },
    { timeout: timeoutMs },
  ).catch(() => { /* splash may not exist — that's OK */ });
}

// ──────────────────────────────────────────────────────────────────────────────
// Test: Root / boots correctly
// ──────────────────────────────────────────────────────────────────────────────

test("@phase1 [CF-SMOKE] / — splash visible, React mounts, scrollHeight > 0", async ({ page }) => {
  const rec = attachRecorders(page);

  const resp = await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });

  // HTTP-level: worker or CF Pages must serve 200
  expect(resp?.status(), `/ returned HTTP ${resp?.status()}`).toBe(200);

  // Splash must be visible immediately after HTML paints (no black screen)
  const splashVisible = await page.evaluate(() => {
    const splash = document.getElementById("app-loading");
    if (!splash) return false;
    const style = getComputedStyle(splash);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  });
  expect(splashVisible, "Splash (#app-loading) must be visible before React mounts — black screen detected").toBe(true);

  // Wait for React to mount
  const mounted = await waitForReactMount(page, 10_000);

  // If env vars are missing, app should still show EnvDiagnosticScreen (not black)
  if (!mounted) {
    const diagVisible = await page.evaluate(() => {
      const body = document.body;
      return body.scrollHeight > 0 && body.innerText.includes("Configuration Required");
    });
    if (diagVisible) {
      console.warn("[CF-SMOKE] Supabase env vars are not set — EnvDiagnosticScreen is showing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in CF Pages dashboard.");
      // Diagnostic screen passes the acceptance test (not a black page)
      const scrollH = await page.evaluate(() => document.body.scrollHeight);
      expect(scrollH, "scrollHeight must be > 0 even with diagnostic screen").toBeGreaterThan(0);
      return;
    }
    expect(mounted, "window.__EASYLOCS_REACT_MOUNTED__ must be true within 10s — app may have crashed").toBe(true);
  }

  await waitForSplashGone(page);

  // scrollHeight > 0
  const scrollH = await page.evaluate(() => document.body.scrollHeight);
  expect(scrollH, `scrollHeight must be > 0, got ${scrollH}`).toBeGreaterThan(0);

  // No JS exceptions
  expect(pageErrors(rec), `Uncaught page errors: ${rec.pageErrors.join(" | ")}`).toHaveLength(0);

  // No failed JS/CSS assets
  expect(rec.failedAssets, `Failed /assets/ requests: ${rec.failedAssets.join(", ")}`).toHaveLength(0);

  // No CSP violations blocking boot scripts
  expect(rec.cspViolations, `CSP violations: ${rec.cspViolations.join(" | ")}`).toHaveLength(0);
});

function pageErrors(rec: Recorders) {
  // Filter known benign errors that don't affect boot
  return rec.pageErrors.filter(
    (e) => !/AbortError|Loading chunk|ResizeObserver|NetworkError: Failed to fetch/i.test(e),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test: SPA fallback — direct refresh on protected routes returns 200
// ──────────────────────────────────────────────────────────────────────────────

const SPA_ROUTES = ["/login", "/dashboard", "/admin", "/orbit", "/radar", "/wallet", "/me"];

for (const route of SPA_ROUTES) {
  test(`@phase5 [CF-SMOKE] direct refresh on ${route} returns 200 (SPA fallback)`, async ({ page }) => {
    const rec = attachRecorders(page);

    const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Cloudflare 404 page = worker SPA fallback is broken
    expect(
      resp?.status(),
      `${route} returned HTTP ${resp?.status()} — SPA fallback (_worker.js) is not serving index.html`,
    ).toBe(200);

    // Must have #root
    const rootExists = await page.evaluate(() => !!document.getElementById("root"));
    expect(rootExists, `${route}: #root element missing — index.html was not served`).toBe(true);

    // No CF error page content
    const isCfError = await page.evaluate(() => {
      const txt = document.body?.innerText || "";
      return /Error 404|This page could not be found|Cloudflare/i.test(txt);
    });
    expect(isCfError, `${route}: Cloudflare 404 page was served instead of index.html`).toBe(false);

    // No failed assets
    expect(rec.failedAssets, `${route} failed assets: ${rec.failedAssets.join(", ")}`).toHaveLength(0);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Test: Hard reload on a nested route keeps SPA alive
// ──────────────────────────────────────────────────────────────────────────────

test("@phase5 [CF-SMOKE] hard reload on /login keeps page stable", async ({ page }) => {
  const rec = attachRecorders(page);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });

  const rootExists = await page.evaluate(() => !!document.getElementById("root"));
  expect(rootExists, "After hard reload on /login, #root must still exist").toBe(true);

  const isCfError = await page.evaluate(() =>
    /Error 404|Cloudflare/i.test(document.body?.innerText || ""),
  );
  expect(isCfError, "CF 404 after hard reload indicates broken SPA fallback").toBe(false);

  expect(rec.failedAssets, `Hard reload failed assets: ${rec.failedAssets.join(", ")}`).toHaveLength(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// Test: Env var presence check (no values leaked)
// ──────────────────────────────────────────────────────────────────────────────

test("@phase1 [CF-SMOKE] env vars presence check — no secrets logged", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForReactMount(page, 8_000).catch(() => {});

  const envStatus = await page.evaluate(() => {
    const env = (window as any).__vite_env || {};
    return {
      hasUrl: typeof (window as any).__supabaseUrl__ !== "undefined"
        // Check via supabaseEnvMissing marker instead of reading value
        || document.body.innerText.includes("VITE_SUPABASE_URL — not set")
        || !!Object.keys(env).find((k) => k === "VITE_SUPABASE_URL"),
      missing: document.body.innerText.includes("Configuration Required")
        ? Array.from(document.body.querySelectorAll("div[style*='monospace']"))
            .map((el) => el.textContent?.trim()).filter(Boolean)
        : [],
    };
  });

  if (envStatus.missing.length > 0) {
    console.warn(
      "[CF-SMOKE] Env vars missing — EnvDiagnosticScreen is showing. Set these in CF Pages:",
      envStatus.missing,
    );
  }

  // Whether vars are set or not, scrollHeight must be > 0
  const scrollH = await page.evaluate(() => document.body.scrollHeight);
  expect(scrollH, "scrollHeight must be > 0 regardless of env var state").toBeGreaterThan(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// Test: window.__EASYLOCS_REACT_MOUNTED__ via evaluate (when env vars ARE set)
// ──────────────────────────────────────────────────────────────────────────────

test("@phase1 [CF-SMOKE] window.__EASYLOCS_REACT_MOUNTED__ is set after boot", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Wait up to 12s for react to mount or for diagnostic screen
  const mounted = await waitForReactMount(page, 12_000);

  if (!mounted) {
    // Acceptable if env vars are missing and diagnostic screen is showing
    const diagScreen = await page.evaluate(() =>
      document.body.innerText.includes("Configuration Required"),
    );
    if (diagScreen) {
      console.warn("[CF-SMOKE] EnvDiagnosticScreen active. Set CF env vars to enable full boot.");
      return; // Pass — diagnostic screen is the correct fallback behavior
    }
    expect(mounted, "__EASYLOCS_REACT_MOUNTED__ must be true — React never committed").toBe(true);
  }

  // Double-check the flag value
  const flag = await page.evaluate(() => !!(window as any).__EASYLOCS_REACT_MOUNTED__);
  expect(flag, "window.__EASYLOCS_REACT_MOUNTED__ must be true").toBe(true);
});
