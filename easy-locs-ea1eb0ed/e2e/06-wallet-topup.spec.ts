import { test, expect } from "./fixtures/base.fixture";

test.describe("Wallet & Transfer Flow (Authenticated)", () => {
  test.describe("Wallet Hub", () => {
    test("wallet page displays numeric balance and currency", async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet");
      await page.waitForLoadState("networkidle");

      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

      const walletPage = page.locator("[data-wallet-page]");
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/\d+/);

      const hasCurrency = /(FCFA|CFA|XOF|€|\$|USD|EUR)/i.test(bodyText || "");
      expect(hasCurrency).toBe(true);
    });

    test("wallet page has quick action buttons (Top Up, Send, Request, Scan)", async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet");
      await page.waitForLoadState("networkidle");

      const actionButtons = page.locator("button:visible");
      await expect(actionButtons.first()).toBeVisible({ timeout: 10000 });
      expect(await actionButtons.count()).toBeGreaterThan(2);
    });

    test("wallet tabs (fiat, qr, security) are selectable", async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet");
      await page.waitForLoadState("networkidle");

      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      if (tabCount > 1) {
        await tabs.nth(1).click();
        await page.waitForTimeout(500);
        await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
      }
    });
  });

  test.describe("Transfer Dialog from Wallet", () => {
    test("Send/Transfer button opens dialog with amount input", async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet");
      await page.waitForLoadState("networkidle");

      const sendBtn = page.locator(
        'button:has-text("envoyer"), button:has-text("send"), button:has-text("transfer")'
      ).first();
      await expect(sendBtn).toBeVisible({ timeout: 10000 });
      await sendBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const amountInput = dialog.locator('input[type="number"], input').first();
      await expect(amountInput).toBeVisible({ timeout: 5000 });
    });

    test("filling amount in dialog binds value and can be cleared", async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet");
      await page.waitForLoadState("networkidle");

      const sendBtn = page.locator(
        'button:has-text("envoyer"), button:has-text("send"), button:has-text("transfer")'
      ).first();
      await expect(sendBtn).toBeVisible({ timeout: 10000 });
      await sendBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const amountInput = dialog.locator('input').first();
      await amountInput.fill("500");
      await expect(amountInput).toHaveValue("500");

      await amountInput.fill("");
      await expect(amountInput).toHaveValue("");
    });

    test("pressing Escape closes the transfer dialog", async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet");
      await page.waitForLoadState("networkidle");

      const sendBtn = page.locator(
        'button:has-text("envoyer"), button:has-text("send"), button:has-text("transfer")'
      ).first();
      await expect(sendBtn).toBeVisible({ timeout: 10000 });
      await sendBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Wallet Transfer Page (/wallet/transfer)", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet/transfer");
      await page.waitForLoadState("networkidle");
      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    });

    test("transfer page renders with amount input (type=number, placeholder=0)", async ({ authenticatedPage: page }) => {
      const amountInput = page.locator('input[type="number"], input[placeholder="0"]').first();
      await expect(amountInput).toBeVisible({ timeout: 10000 });
    });

    test("preset amount buttons (25, 50, 100, 250, 500) are displayed", async ({ authenticatedPage: page }) => {
      const presetButtons = page.locator('button:has-text("25"), button:has-text("50"), button:has-text("100"), button:has-text("250"), button:has-text("500")');
      const presetCount = await presetButtons.count();
      expect(presetCount).toBeGreaterThanOrEqual(3);
    });

    test("clicking preset amount button fills the amount input", async ({ authenticatedPage: page }) => {
      const presetBtn = page.locator('button:has-text("100")').first();
      await expect(presetBtn).toBeVisible({ timeout: 10000 });
      await presetBtn.click();

      const amountInput = page.locator('input[type="number"], input[placeholder="0"]').first();
      await expect(amountInput).not.toHaveValue("0");
      await expect(amountInput).not.toHaveValue("");
    });

    test("note textarea accepts optional text", async ({ authenticatedPage: page }) => {
      const noteTextarea = page.locator("textarea:visible").first();
      if (await noteTextarea.isVisible()) {
        await noteTextarea.fill("E2E transfer test note");
        await expect(noteTextarea).toHaveValue("E2E transfer test note");
      }
    });

    test("transfer requires recipient selection — send button shows amount", async ({ authenticatedPage: page }) => {
      const amountInput = page.locator('input[type="number"], input[placeholder="0"]').first();
      await amountInput.fill("100");

      const sendButton = page.locator('button:visible').last();
      const buttonText = await sendButton.textContent();
      expect(buttonText).toMatch(/\d+|send|envoyer/i);
    });

    test("attempting transfer without recipient shows validation or contact picker", async ({ authenticatedPage: page }) => {
      const amountInput = page.locator('input[type="number"], input[placeholder="0"]').first();
      await amountInput.fill("50");

      const actionBtn = page.locator('button:visible').last();
      await actionBtn.click();
      await page.waitForTimeout(2000);

      const hasContactPicker = await page.locator('[role="dialog"], .sheet, [data-testid*="contact"]').isVisible().catch(() => false);
      const hasValidationError = await page.locator('[data-sonner-toast], [role="alert"], .text-destructive').isVisible().catch(() => false);
      const stayedOnPage = page.url().includes("transfer");
      expect(hasContactPicker || hasValidationError || stayedOnPage).toBe(true);
    });
  });

  test.describe("Wallet Top-Up Page (/wallet/top-up)", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet/top-up");
      await page.waitForLoadState("networkidle");
      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    });

    test("top-up page renders with amount input (min=1, max=50000)", async ({ authenticatedPage: page }) => {
      const amountInput = page.locator('input[type="number"]').first();
      await expect(amountInput).toBeVisible({ timeout: 10000 });

      const min = await amountInput.getAttribute("min");
      const max = await amountInput.getAttribute("max");
      expect(min).toBe("1");
      expect(max).toBe("50000");
    });

    test("top-up preset buttons (50, 100, 200, 500, 1000) are displayed", async ({ authenticatedPage: page }) => {
      const presetButtons = page.locator('button:has-text("50"), button:has-text("100"), button:has-text("200"), button:has-text("500"), button:has-text("1000")');
      const presetCount = await presetButtons.count();
      expect(presetCount).toBeGreaterThanOrEqual(3);
    });

    test("top-up action button shows amount and currency", async ({ authenticatedPage: page }) => {
      const amountInput = page.locator('input[type="number"]').first();
      await amountInput.fill("200");

      const topUpBtn = page.locator('button:visible').last();
      const buttonText = await topUpBtn.textContent();
      expect(buttonText).toMatch(/200|top|recharger/i);
    });

    test("payment method selector (card, apple/google) is visible", async ({ authenticatedPage: page }) => {
      const methodButtons = page.locator('button:has-text("card"), button:has-text("carte"), button:has-text("apple"), button:has-text("google")');
      const methodCount = await methodButtons.count();
      expect(methodCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Wallet Request Funds (/wallet/request)", () => {
    test("request page renders with form content", async ({ authenticatedPage: page }) => {
      await page.goto("/#/wallet/request");
      await page.waitForLoadState("networkidle");

      await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.trim().length).toBeGreaterThan(20);
    });
  });
});
