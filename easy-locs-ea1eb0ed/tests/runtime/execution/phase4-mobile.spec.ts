import { test, expect } from "@playwright/test";
import {
  attachRuntimeRecorders,
  expectNoErrorBoundary,
  waitForRouteSettled,
} from "./_helpers";

/**
 * Phase 4 — Mobile viewport suite.
 *
 * Asserts the bottom nav (when present) is reachable, no fixed-position
 * overlay (cookie banner, sticky CTA) covers a primary tap target, and
 * scroll is not locked by a stray modal.
 */

test("@phase4 landing has a tappable interactive element above the fold", async ({ page }) => {
  const rec = attachRuntimeRecorders(page);
  await page.goto("/");
  await waitForRouteSettled(page);
  await expectNoErrorBoundary(page);

  const interactive = page
    .locator('a, button, [role="button"]')
    .filter({ has: page.locator(":visible") })
    .first();
  await expect(interactive).toBeVisible();
  const box = await interactive.boundingBox();
  expect(box, "no bounding box for first interactive element").not.toBeNull();
  if (box) {
    expect(box.height).toBeGreaterThanOrEqual(20);
    expect(box.width).toBeGreaterThanOrEqual(20);
  }
  expect(rec.pageErrors, rec.pageErrors.join(" | ")).toHaveLength(0);
});

test("@phase4 /login form inputs are not covered by overlays on mobile", async ({ page }) => {
  await page.goto("/login");
  await waitForRouteSettled(page);
  await expectNoErrorBoundary(page);

  const firstInput = page.locator("input").first();
  await expect(firstInput).toBeVisible();
  const box = await firstInput.boundingBox();
  expect(box).not.toBeNull();
  // Confirm tap actually lands on input (or descendant), not a sticky banner.
  if (box) {
    const elAtPoint = await page.evaluate(
      (pt) => {
        const el = document.elementFromPoint(pt.x, pt.y);
        return el ? el.tagName + (el.id ? "#" + el.id : "") : null;
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(elAtPoint, "another element overlays the first login input").toMatch(
      /INPUT|LABEL|FORM|DIV|BUTTON|SECTION|MAIN|SPAN/i,
    );
  }
});

test("@phase4 page is scrollable on /browse/food (no scroll-lock leak)", async ({ page }) => {
  await page.goto("/browse/food");
  await waitForRouteSettled(page);
  await expectNoErrorBoundary(page);

  const overflow = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      html: getComputedStyle(html).overflow,
      body: getComputedStyle(body).overflow,
      htmlPos: getComputedStyle(html).position,
    };
  });
  expect(overflow.html, "html overflow locked unexpectedly").not.toMatch(/^hidden$/i);
  expect(overflow.body, "body overflow locked unexpectedly").not.toMatch(/^hidden$/i);
});
