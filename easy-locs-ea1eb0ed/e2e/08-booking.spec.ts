import { test, expect } from "@playwright/test";

test.describe("Booking Flow", () => {
  test("listings page renders clickable property links", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const links = page.locator("a[href]");
    await expect(links.first()).toBeVisible({ timeout: 10000 });
    expect(await links.count()).toBeGreaterThan(0);
  });

  test("clicking listing navigates to detail page with property content", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator("a[href]").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });

    const urlBefore = page.url();
    await firstLink.click();

    await page.waitForFunction(
      (prevUrl) => window.location.href !== prevUrl,
      urlBefore,
      { timeout: 10000 }
    );

    expect(page.url()).not.toBe(urlBefore);
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const heading = page.locator("h1, h2, [data-testid='property-title']").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("property detail page shows actionable booking or contact UI", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator("a[href]").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await firstLink.click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const actionButtons = page.locator(
      'button:has-text("Book"), button:has-text("Réserver"), ' +
      'button:has-text("Contact"), button:has-text("Contacter"), ' +
      '[data-testid="booking-btn"], [data-testid="contact-btn"], ' +
      'a:has-text("Book"), a:has-text("Réserver")'
    );
    await expect(actionButtons.first()).toBeVisible({ timeout: 10000 });
    expect(await actionButtons.count()).toBeGreaterThan(0);
  });

  test("full booking journey: marketplace → select → detail → trigger booking action", async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const propertyCards = page.locator("a[href]");
    await expect(propertyCards.first()).toBeVisible({ timeout: 10000 });
    const cardCount = await propertyCards.count();
    expect(cardCount).toBeGreaterThan(0);

    const urlBefore = page.url();
    await propertyCards.first().click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toBe(urlBefore);
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const detailContent = page.locator("h1, h2, [data-testid='property-title']").first();
    await expect(detailContent).toBeVisible({ timeout: 10000 });
    const headingText = await detailContent.textContent();
    expect(headingText).toBeTruthy();
    expect(headingText!.trim().length).toBeGreaterThan(0);

    const bookBtn = page.locator(
      'button:has-text("Book"), button:has-text("Réserver"), ' +
      '[data-testid="booking-btn"], a:has-text("Book"), a:has-text("Réserver")'
    ).first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });

    const urlBeforeBook = page.url();
    await bookBtn.click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const urlChanged = page.url() !== urlBeforeBook;
    const modalAppeared = await page.locator('[role="dialog"], .modal, [data-testid="booking-modal"], [data-testid="auth-modal"]').first().isVisible().catch(() => false);
    const formAppeared = await page.locator('form, [data-testid="booking-form"], input[type="date"]').first().isVisible().catch(() => false);
    const toastAppeared = await page.locator('[role="alert"], .toast, [data-testid="toast"]').first().isVisible().catch(() => false);

    const actionTriggered = urlChanged || modalAppeared || formAppeared || toastAppeared;
    expect(actionTriggered).toBe(true);
  });

  test("dashboard page has multiple tabs and tab switching works", async ({ page }) => {
    await page.goto("/#/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(1);

    const firstTabText = await tabs.first().textContent();
    await tabs.nth(1).click();
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const secondTabText = await tabs.nth(1).textContent();
    expect(secondTabText).not.toBe(firstTabText);
  });

  test("dashboard tab panel shows content after tab click", async ({ page }) => {
    await page.goto("/#/dashboard");
    await page.waitForLoadState("networkidle");

    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });

    await tabs.nth(1).click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const panel = page.locator('[role="tabpanel"], .tab-content, main').first();
    await expect(panel).toBeVisible({ timeout: 10000 });
    const panelText = await panel.textContent();
    expect(panelText).toBeTruthy();
  });
});
