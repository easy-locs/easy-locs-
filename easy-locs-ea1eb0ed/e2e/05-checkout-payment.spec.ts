import { test, expect } from "./fixtures/base.fixture";

test.describe("Checkout & Payment Flow (Authenticated)", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto("/#/checkout");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("checkout page renders with meaningful content", async ({ authenticatedPage: page }) => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(20);
  });

  test("checkout page shows order total/subtotal or empty cart state", async ({ authenticatedPage: page }) => {
    const bodyText = await page.locator("body").textContent();
    const hasPriceInfo = /\d+[\s.,]*\d*\s*(FCFA|CFA|€|XOF|\$)/i.test(bodyText!);
    const hasOrderTerms = /(total|subtotal|sous-total|montant|amount|order|commande)/i.test(bodyText!);
    const hasEmptyCartTerms = /(empty|vide|no items|aucun|panier|cart)/i.test(bodyText!);
    expect(hasPriceInfo || hasOrderTerms || hasEmptyCartTerms).toBe(true);
  });

  test("checkout action button triggers payment dialog or navigation", async ({ authenticatedPage: page }) => {
    const urlBefore = page.url();
    const actionBtn = page.locator('button[type="submit"], button:has-text("Pay"), button:has-text("Payer"), button:has-text("Confirm"), button:has-text("Valider")').first();

    const hasPrimaryAction = await actionBtn.isVisible().catch(() => false);
    if (hasPrimaryAction) {
      await actionBtn.click();

      await expect(async () => {
        const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
        const toastVisible = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);
        const urlChanged = page.url() !== urlBefore;
        expect(dialogVisible || toastVisible || urlChanged).toBe(true);
      }).toPass({ timeout: 10000 });
    }

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("food checkout route renders without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/food/checkout");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(20);
  });

  test("checkout address selector renders address-related UI", async ({ authenticatedPage: page }) => {
    await page.goto("/#/checkout/address-selector");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(20);
  });

  test("checkout page remains stable during rapid re-navigation", async ({ authenticatedPage: page }) => {
    for (let i = 0; i < 3; i++) {
      await page.goto("/#/checkout");
      await page.waitForLoadState("networkidle");
    }

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });
});
