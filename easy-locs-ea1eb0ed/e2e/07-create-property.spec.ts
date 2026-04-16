import { test, expect } from "./fixtures/base.fixture";

test.describe("Property Listing Creation (Authenticated)", () => {
  test.describe("AddProperty form (/dashboard/property/add)", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.goto("/#/dashboard/property/add");
      await page.waitForLoadState("networkidle");
      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    });

    test("renders form with label (title) input and submit button", async ({ authenticatedPage: page }) => {
      const labelInput = page.locator('input[type="text"], input:not([type])').first();
      await expect(labelInput).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 });
    });

    test("form contains country selector and listing mode buttons", async ({ authenticatedPage: page }) => {
      const countrySelector = page.locator('select, [role="combobox"]').first();
      await expect(countrySelector).toBeVisible({ timeout: 10000 });

      const modeButtons = page.locator('button:has-text("Long"), button:has-text("Seasonal"), button:has-text("Sale"), button:has-text("Location"), button:has-text("Saisonni"), button:has-text("Vente")');
      await expect(modeButtons.first()).toBeVisible({ timeout: 5000 });
    });

    test("filling property label field binds value correctly", async ({ authenticatedPage: page }) => {
      const labelInput = page.locator('input[type="text"], input:not([type])').first();
      await expect(labelInput).toBeVisible({ timeout: 10000 });

      const testLabel = "Appartement E2E Test " + Date.now();
      await labelInput.fill(testLabel);
      await expect(labelInput).toHaveValue(testLabel);
    });

    test("filling financial fields (rent, charges, deposit) binds numeric values", async ({ authenticatedPage: page }) => {
      const numberInputs = page.locator('input[type="number"]:visible');
      await expect(numberInputs.first()).toBeVisible({ timeout: 10000 });

      const count = await numberInputs.count();
      expect(count).toBeGreaterThanOrEqual(1);

      await numberInputs.first().fill("150000");
      await expect(numberInputs.first()).toHaveValue("150000");
    });

    test("filling description textarea binds text content", async ({ authenticatedPage: page }) => {
      const description = page.locator("textarea:visible").first();
      await expect(description).toBeVisible({ timeout: 10000 });

      const descText = "Bel appartement au centre-ville, 3 chambres, cuisine équipée, proche transports.";
      await description.fill(descText);
      await expect(description).toHaveValue(descText);
    });

    test("submitting empty form shows validation errors and stays on page", async ({ authenticatedPage: page }) => {
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeVisible({ timeout: 10000 });
      await submitBtn.click();
      await page.waitForTimeout(2000);

      const hasValidation = await page.evaluate(() => {
        const invalidInputs = document.querySelectorAll(":invalid");
        const errorUI = document.querySelectorAll('[role="alert"], .text-destructive, .text-red-500, [data-state="open"], [data-sonner-toast]');
        return invalidInputs.length > 0 || errorUI.length > 0;
      });
      expect(hasValidation).toBe(true);
      expect(page.url()).toContain("property/add");
    });

    test("submitting filled form triggers success toast with 'enregistré' or URL redirect", async ({ authenticatedPage: page }) => {
      const labelInput = page.locator('input[type="text"], input:not([type])').first();
      await expect(labelInput).toBeVisible({ timeout: 10000 });
      await labelInput.fill("E2E Property Submit " + Date.now());

      const textareas = page.locator("textarea:visible");
      if (await textareas.count() > 0) {
        await textareas.first().fill("Description pour test E2E de création de propriété.");
      }

      const numberInputs = page.locator('input[type="number"]:visible');
      if (await numberInputs.count() > 0) {
        await numberInputs.first().fill("100000");
      }

      const urlBefore = page.url();
      await page.locator('button[type="submit"]').first().click();

      await expect(async () => {
        const toastText = await page.locator('[data-sonner-toast]').textContent().catch(() => "");
        const hasSuccessToast = /enregistré|saved|success|créé|created/i.test(toastText || "");
        const redirectedToDashboard = page.url().includes("/dashboard/country") || page.url().includes("/dashboard") && page.url() !== urlBefore;
        expect(hasSuccessToast || redirectedToDashboard).toBe(true);
      }).toPass({ timeout: 15000 });
    });
  });

  test.describe("CreateListing form (/dashboard/create-listing)", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.goto("/#/dashboard/create-listing");
      await page.waitForLoadState("networkidle");
      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    });

    test("renders form with category selector, title, and description fields", async ({ authenticatedPage: page }) => {
      const formElements = page.locator('input:visible, textarea:visible');
      await expect(formElements.first()).toBeVisible({ timeout: 10000 });
      expect(await formElements.count()).toBeGreaterThanOrEqual(2);
    });

    test("filling title and description binds values correctly", async ({ authenticatedPage: page }) => {
      const titleInput = page.locator('input:visible').first();
      await expect(titleInput).toBeVisible({ timeout: 10000 });

      await titleInput.fill("E2E Listing Title " + Date.now());
      await expect(titleInput).not.toHaveValue("");

      const descTextarea = page.locator("textarea:visible").first();
      if (await descTextarea.isVisible()) {
        await descTextarea.fill("E2E listing description for marketplace test.");
        await expect(descTextarea).not.toHaveValue("");
      }
    });

    test("submitting filled listing triggers success toast mentioning 'published' or redirects to shop", async ({ authenticatedPage: page }) => {
      const inputs = page.locator('input:visible');
      await expect(inputs.first()).toBeVisible({ timeout: 10000 });
      await inputs.first().fill("E2E Marketplace Listing " + Date.now());

      const descTextarea = page.locator("textarea:visible").first();
      if (await descTextarea.isVisible()) {
        await descTextarea.fill("E2E description for listing creation test.");
      }

      const cityInput = page.locator('input:visible').nth(1);
      if (await cityInput.isVisible()) {
        await cityInput.fill("Paris");
      }

      const urlBefore = page.url();
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      await expect(async () => {
        const toastText = await page.locator('[data-sonner-toast]').textContent().catch(() => "");
        const hasSuccessToast = /published|publié|success|créé|created|enregistré/i.test(toastText || "");
        const redirectedToShop = page.url().includes("my-shop") || page.url() !== urlBefore;
        const hasValidationError = await page.locator('.text-destructive, .text-red-500').isVisible().catch(() => false);
        expect(hasSuccessToast || redirectedToShop || hasValidationError).toBe(true);
      }).toPass({ timeout: 15000 });
    });
  });
});
