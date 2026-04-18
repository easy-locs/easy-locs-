import { type Page, expect } from "@playwright/test";

/**
 * Shared helpers for the runtime audit suite (task #1069).
 *
 * Goal: detect runtime defects (silent crashes, infinite loaders, redirect
 * loops, hydration mismatches, dead links) on real navigations against the
 * running dev server.
 */

export const ERROR_BOUNDARY_SELECTORS = [
  ".error-boundary",
  '[data-testid="error-fallback"]',
  '[data-testid="global-error-boundary"]',
  '[data-testid="feature-error-boundary"]',
];

export async function expectNoErrorBoundary(page: Page) {
  for (const sel of ERROR_BOUNDARY_SELECTORS) {
    await expect(page.locator(sel)).toHaveCount(0);
  }
}

/**
 * Capture console errors + page errors + 5xx network responses across a
 * navigation. Some noisy browser-extension / favicon / preload errors are
 * filtered so the audit only reports app-originated runtime issues.
 */
export function attachRuntimeRecorders(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      // 3rd-party noise we don't own and that doesn't break user flows
      /favicon\.ico|chrome-extension|partytown|sentry|posthog|workbox|sw\.js|service-worker/i.test(
        text,
      )
    )
      return;
    consoleErrors.push(text);
  });

  page.on("pageerror", (err) => {
    pageErrors.push(`${err.name}: ${err.message}`);
  });

  page.on("response", (resp) => {
    const status = resp.status();
    const url = resp.url();
    if (status >= 500 && status < 600 && /localhost|easy-locs/.test(url)) {
      failedRequests.push(`${status} ${url}`);
    }
  });

  return {
    consoleErrors,
    pageErrors,
    failedRequests,
    summary() {
      return {
        consoleErrors: [...consoleErrors],
        pageErrors: [...pageErrors],
        failedRequests: [...failedRequests],
      };
    },
  };
}

/**
 * Wait until the route either renders a real DOM node OR the auth gate
 * sends us to /login. The point is to detect *indefinite* skeletons — if
 * we are still seeing a global skeleton after the timeout, that's a
 * runtime bug worth reporting.
 */
/**
 * `page.goto` with `domcontentloaded` (default `load` is way too slow on a
 * vite dev server) followed by `waitForRouteSettled`. Returns the response
 * so callers can still assert status.
 */
export async function gotoSettled(page: Page, target: string, timeout = 8_000) {
  const resp = await page
    .goto(target, { waitUntil: "domcontentloaded", timeout: 20_000 })
    .catch(() => null);
  await waitForRouteSettled(page, timeout);
  return resp;
}

export async function waitForRouteSettled(page: Page, timeout = 8_000) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  // Wait for app shell to render *something* meaningful — bound by `timeout`
  // so a slow dev server / streaming chunk doesn't stall the entire suite.
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const len = await page
      .evaluate(() => (document.body?.innerText || "").trim().length)
      .catch(() => 0);
    if (len > 30) break;
    await page.waitForTimeout(150);
  }
  await page
    .evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
    )
    .catch(() => {});
}

export function isRedirectLoop(urls: string[]): boolean {
  if (urls.length < 4) return false;
  // Same URL appearing 3+ times in last 6 navigations indicates ping-pong.
  const tail = urls.slice(-6);
  const counts = new Map<string, number>();
  for (const u of tail) counts.set(u, (counts.get(u) ?? 0) + 1);
  return [...counts.values()].some((c) => c >= 3);
}
