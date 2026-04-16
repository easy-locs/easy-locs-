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

  test("Orbit page displays conversation list or empty state", async ({ authenticatedPage: page }) => {
    await page.goto("/#/orbit");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("multiple messages can be sent in sequence without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/orbit");
    await page.waitForLoadState("networkidle");

    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 3; i++) {
      const msg = `E2E-seq-${i}-${Date.now()}`;
      await composer.fill(msg);
      await expect(composer).toHaveValue(msg);

      const sendBtn = page.locator('button[type="submit"]').first();
      await sendBtn.click();
      await expect(composer).toHaveValue("", { timeout: 5000 });
    }

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
  });

  test("Orbit contacts page renders without errors", async ({ authenticatedPage: page }) => {
    await page.goto("/#/orbit/contacts");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("add contact page renders with input form", async ({ authenticatedPage: page }) => {
    await page.goto("/#/add-contact");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('.error-boundary, [data-testid="error-fallback"]')).toHaveCount(0);

    const inputs = page.locator("input:visible");
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
  });

  test("composer supports multiline text input", async ({ authenticatedPage: page }) => {
    await page.goto("/#/orbit");
    await page.waitForLoadState("networkidle");

    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 10000 });

    const multiline = "Line 1\nLine 2\nLine 3";
    await composer.fill(multiline);
    const value = await composer.inputValue();
    expect(value).toContain("Line 1");
    expect(value).toContain("Line 2");
  });
});
