import { test, expect } from "./fixtures/base.fixture";

test.describe("Wallet Top-Up (Authenticated)", () => {
  test("displays wallet page with numeric balance", async ({ authenticatedPage: page }) => {
    await page.goto("/#/wallet");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    await expect(page.locator("body")).toContainText(/\d/);
  });

  test("transfer button opens dialog with amount input field", async ({ authenticatedPage: page }) => {
    await page.goto("/#/wallet");
    await page.waitForLoadState("networkidle");

    const sendBtn = page.locator(
      'button:has-text("envoyer"), button:has-text("send"), button:has-text("transfer"), button:has-text("recharger"), button:has-text("top")'
    ).first();
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await sendBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const amountInput = dialog.locator("input").first();
    await expect(amountInput).toBeVisible({ timeout: 5000 });
  });

  test("filling amount in transfer dialog updates input value", async ({ authenticatedPage: page }) => {
    await page.goto("/#/wallet");
    await page.waitForLoadState("networkidle");

    const sendBtn = page.locator(
      'button:has-text("envoyer"), button:has-text("send"), button:has-text("transfer"), button:has-text("recharger"), button:has-text("top")'
    ).first();
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await sendBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const amountInput = dialog.locator("input").first();
    await amountInput.fill("50");
    await expect(amountInput).toHaveValue("50");
  });
});
