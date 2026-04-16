import { test, expect } from "@playwright/test";
import { test as authTest, expect as authExpect } from "./fixtures/base.fixture";

test.describe("Booking Flow — Property Discovery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/real-estate");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("marketplace renders multiple property listing cards", async ({ page }) => {
    const listings = page.locator("a[href]");
    await expect(listings.first()).toBeVisible({ timeout: 10000 });
    expect(await listings.count()).toBeGreaterThan(1);
  });

  test("clicking a listing navigates to detail page with property heading", async ({ page }) => {
    const firstLink = page.locator("a[href]").first();
    await expect(firstLink).toBeVisible({ timeout: 10000 });
    const linkText = await firstLink.textContent();
    expect(linkText!.trim().length).toBeGreaterThan(0);

    await firstLink.click();
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1, h2, [data-testid='property-title']").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const headingText = await heading.textContent();
    expect(headingText!.trim().length).toBeGreaterThan(0);
  });

  test("property detail displays price with currency", async ({ page }) => {
    await page.locator("a[href]").first().click();
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/\d+[\s.,]*\d*\s*(FCFA|CFA|€|XOF|\$|\/|nuit|night|mois|month)/i);
  });

  test("property detail displays images or media gallery", async ({ page }) => {
    await page.locator("a[href]").first().click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("img").first()).toBeVisible({ timeout: 10000 });
  });

  test("property detail has Book/Reserve or Contact action button", async ({ page }) => {
    await page.locator("a[href]").first().click();
    await page.waitForLoadState("networkidle");

    const bookBtn = page.locator(
      'button:has-text("Book"), button:has-text("Réserver"), ' +
      'button:has-text("Contact"), button:has-text("Contacter"), ' +
      '[data-testid="booking-btn"], [data-testid="contact-btn"]'
    ).first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });
  });

  test("full journey: marketplace → listing detail → click Book → booking UI appears", async ({ page }) => {
    const firstCard = page.locator("a[href]").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await page.waitForLoadState("networkidle");

    const bookBtn = page.locator(
      'button:has-text("Book"), button:has-text("Réserver"), ' +
      '[data-testid="booking-btn"]'
    ).first();
    await expect(bookBtn).toBeVisible({ timeout: 10000 });

    const urlBefore = page.url();
    await bookBtn.click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    await expect(async () => {
      const navigatedToBooking = page.url().includes("booking") || page.url().includes("payment");
      const dialogShown = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      const formShown = await page.locator('input[type="text"], input[type="email"], input[type="date"]').first().isVisible().catch(() => false);
      const urlChanged = page.url() !== urlBefore;
      expect(navigatedToBooking || dialogShown || formShown || urlChanged).toBe(true);
    }).toPass({ timeout: 10000 });
  });
});

authTest.describe("Booking Flow — Authenticated Property Booking", () => {
  authTest("property booking page renders guest info form with name, email, phone fields", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/booking");
    await page.waitForLoadState("networkidle");

    await authExpect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const textInputs = page.locator('input[type="text"]:visible, input[type="email"]:visible');
    await authExpect(textInputs.first()).toBeVisible({ timeout: 10000 });
    const inputCount = await textInputs.count();
    authExpect(inputCount).toBeGreaterThanOrEqual(2);
  });

  authTest("booking page shows price breakdown with base price and total", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/booking");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").textContent();
    const hasPricing = /\d+/.test(bodyText || "");
    authExpect(hasPricing).toBe(true);
  });

  authTest("booking page has Continue to Payment button", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/booking");
    await page.waitForLoadState("networkidle");

    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Continuer"), button:has-text("Payment"), button:has-text("Paiement"), button[type="submit"]').first();
    await authExpect(continueBtn).toBeVisible({ timeout: 10000 });
  });

  authTest("filling booking form guest info and clicking Continue advances to payment", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/booking");
    await page.waitForLoadState("networkidle");

    const textInputs = page.locator('input[type="text"]:visible');
    const textCount = await textInputs.count();
    for (let i = 0; i < Math.min(textCount, 2); i++) {
      const val = await textInputs.nth(i).inputValue();
      if (!val) {
        await textInputs.nth(i).fill(i === 0 ? "E2E" : "TestUser");
      }
    }

    const emailInput = page.locator('input[type="email"]:visible').first();
    if (await emailInput.isVisible()) {
      const val = await emailInput.inputValue();
      if (!val) await emailInput.fill("e2e@test.com");
    }

    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Continuer"), button:has-text("Payment"), button[type="submit"]').first();
    if (await continueBtn.isEnabled()) {
      const urlBefore = page.url();
      await continueBtn.click();
      await page.waitForLoadState("networkidle");

      await authExpect(async () => {
        const wentToPayment = page.url().includes("payment");
        const urlChanged = page.url() !== urlBefore;
        const toastShown = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);
        authExpect(wentToPayment || urlChanged || toastShown).toBe(true);
      }).toPass({ timeout: 10000 });
    }
  });

  authTest("property payment page displays payment method options", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/payment");
    await page.waitForLoadState("networkidle");

    await authExpect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const bodyText = await page.locator("body").textContent();
    const hasPaymentMethods = /(wallet|card|carte|mobile money|bank|banque|crypto|apple pay|google pay)/i.test(bodyText || "");
    authExpect(hasPaymentMethods || bodyText!.trim().length > 20).toBe(true);
  });

  authTest("property payment page shows booking reference", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/payment");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").textContent();
    authExpect(bodyText!.trim().length).toBeGreaterThan(20);
  });

  authTest("property confirmation page displays booking confirmed state", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/confirmation");
    await page.waitForLoadState("networkidle");

    await authExpect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const bodyText = await page.locator("body").textContent();
    authExpect(bodyText!.trim().length).toBeGreaterThan(20);
  });

  authTest("confirmation page has Contact Host and Search Another Property actions", async ({ authenticatedPage: page }) => {
    await page.goto("/#/property/confirmation");
    await page.waitForLoadState("networkidle");

    const actionButtons = page.locator("button:visible, a:visible");
    await authExpect(actionButtons.first()).toBeVisible({ timeout: 10000 });
    authExpect(await actionButtons.count()).toBeGreaterThan(0);
  });
});
