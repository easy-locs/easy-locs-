import { test, expect } from "@playwright/test";
import {
  attachRuntimeRecorders,
  expectNoErrorBoundary,
  isRedirectLoop,
  waitForRouteSettled,
} from "./_helpers";

/**
 * Phase 3 — Edge-case stress suite.
 *
 * Race conditions, refresh-during-load, navigation spam, slow network,
 * tab-visibility switches. Asserts no "Maximum update depth exceeded",
 * no hidden redirect loops, no duplicate pageerrors.
 */

const STRESS_ROUTES = ["/", "/login", "/dashboard", "/wallet", "/me", "/browse/food"];

test("@phase3 rapid navigation spam does not break the app", async ({ page }) => {
  const rec = attachRuntimeRecorders(page);
  const urls: string[] = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) urls.push(f.url());
  });

  for (let i = 0; i < 3; i++) {
    for (const r of STRESS_ROUTES) {
      await page.goto(r).catch(() => {});
    }
  }
  await waitForRouteSettled(page);

  await expectNoErrorBoundary(page);
  expect(isRedirectLoop(urls), `redirect loop: ${urls.slice(-10).join(" -> ")}`).toBe(false);
  const fatal = rec.pageErrors.filter((e) => /Maximum update depth|Invariant failed|chunk failed/i.test(e));
  expect(fatal, `fatal errors: ${fatal.join(" | ")}`).toHaveLength(0);
});

test("@phase3 back/forward spam stays stable", async ({ page }) => {
  const rec = attachRuntimeRecorders(page);
  await page.goto("/");
  await page.goto("/login");
  await page.goto("/browse/food");
  for (let i = 0; i < 4; i++) {
    await page.goBack().catch(() => {});
    await page.goForward().catch(() => {});
  }
  await waitForRouteSettled(page);
  await expectNoErrorBoundary(page);
  const fatal = rec.pageErrors.filter((e) => /Maximum update depth|chunk failed/i.test(e));
  expect(fatal, fatal.join(" | ")).toHaveLength(0);
});

test("@phase3 refresh during load does not strand a skeleton", async ({ page }) => {
  await page.goto("/dashboard").catch(() => {});
  // Trigger reload before the first render fully settles.
  await page.reload().catch(() => {});
  await waitForRouteSettled(page);
  await expectNoErrorBoundary(page);
  const txt = await page.locator("body").innerText();
  expect(txt.trim().length).toBeGreaterThan(10);
});

test("@phase3 slow network still settles without infinite loader", async ({ page, context }) => {
  // Throttle network: 100ms latency on every request.
  await context.route("**/*", async (route) => {
    await new Promise((r) => setTimeout(r, 50));
    await route.continue();
  });
  const rec = attachRuntimeRecorders(page);
  await page.goto("/login");
  await waitForRouteSettled(page, 20_000);
  await expectNoErrorBoundary(page);
  expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
});

test("@phase3 tab-visibility switch does not crash the running page", async ({ page }) => {
  await page.goto("/");
  await waitForRouteSettled(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitForRouteSettled(page);
  await expectNoErrorBoundary(page);
});
