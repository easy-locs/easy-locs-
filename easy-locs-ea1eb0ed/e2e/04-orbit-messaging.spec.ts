import { test, expect } from "./fixtures/base.fixture";

test.describe("Orbit Messaging (Authenticated)", () => {
  test("renders Orbit page with visible composer textarea", async ({ authenticatedPage: page }) => {
    await page.goto("/#/orbit");
    await page.waitForLoadState("networkidle");

    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 10000 });
  });

  test("sends message: typed text clears from composer after submit", async ({ authenticatedPage: page }) => {
    await page.goto("/#/orbit");
    await page.waitForLoadState("networkidle");

    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 10000 });

    const testMessage = `E2E-${Date.now()}`;
    await composer.fill(testMessage);
    await expect(composer).toHaveValue(testMessage);

    const sendBtn = page.locator('button[type="submit"]').first();
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
    await sendBtn.click();

    await expect(composer).toHaveValue("", { timeout: 5000 });
  });

  test("sent message appears in conversation view", async ({ authenticatedPage: page }) => {
    await page.goto("/#/orbit");
    await page.waitForLoadState("networkidle");

    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 10000 });

    const testMessage = `E2E-verify-${Date.now()}`;
    await composer.fill(testMessage);
    const sendBtn = page.locator('button[type="submit"]').first();
    await sendBtn.click();

    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 });
  });
});
