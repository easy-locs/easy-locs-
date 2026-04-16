import { test, expect } from "@playwright/test";

test.describe("Cross-Pillar: Legacy UPPERCASE → Colon Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      (window as any).__E2E_RUNNING__ = true;
    });
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__E2E_RUNNING__ = false;
    });
  });

  test("ORDER_CONFIRMED legacy event triggers order:confirmed on bus", async ({ page }) => {
    const received = await page.evaluate(() => {
      const captured: string[] = [];
      const bus = (window as any).__platformBus__;
      if (!bus) return captured;
      bus.on("order:confirmed", () => captured.push("order:confirmed"));
      bus.emit("ORDER_CONFIRMED", { orderId: "legacy-001" }, "e2e");
      return captured;
    });
    expect(received).toContain("order:confirmed");
  });

  test("PAYMENT_SUCCESS legacy event triggers wallet:payment_success", async ({ page }) => {
    const received = await page.evaluate(() => {
      const captured: string[] = [];
      const bus = (window as any).__platformBus__;
      if (!bus) return captured;
      bus.on("wallet:payment_success", () => captured.push("wallet:payment_success"));
      bus.emit("PAYMENT_SUCCESS", { transactionId: "legacy-tx-001" }, "e2e");
      return captured;
    });
    expect(received).toContain("wallet:payment_success");
  });
});
