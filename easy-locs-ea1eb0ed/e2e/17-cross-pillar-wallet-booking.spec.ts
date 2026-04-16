import { test, expect } from "@playwright/test";

test.describe("Cross-Pillar: Wallet → Booking Settlement", () => {
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

  test("booking:completed triggers wallet:deduct on platform bus", async ({ page }) => {
    const events = await page.evaluate(() => {
      const captured: string[] = [];
      const bus = (window as any).__platformBus__;
      if (!bus) return captured;
      bus.on("wallet:deduct", () => captured.push("wallet:deduct"));
      bus.on("payment:capture", () => captured.push("payment:capture"));
      bus.emit("booking:completed", {
        bookingId: "e2e-booking-001",
        amount: 150,
        currency: "AED",
      }, "e2e-test");
      return captured;
    });
    expect(events).toContain("wallet:deduct");
    expect(events).toContain("payment:capture");
  });

  test("wallet balance cache invalidated after booking:completed", async ({ page }) => {
    const invalidated = await page.evaluate(() => {
      const keys: string[] = [];
      const orig = (window as any).__queryClient__?.invalidateQueries;
      if (!orig) return keys;
      (window as any).__queryClient__.invalidateQueries = (opts: any) => {
        if (opts?.queryKey?.[0]) keys.push(opts.queryKey[0]);
        return orig.call((window as any).__queryClient__, opts);
      };
      const bus = (window as any).__platformBus__;
      if (bus) bus.emit("booking:completed", { bookingId: "e2e-002", amount: 50, currency: "AED" }, "e2e");
      (window as any).__queryClient__.invalidateQueries = orig;
      return keys;
    });
    expect(invalidated).toContain("wallet-balance");
    expect(invalidated).toContain("my-bookings");
  });
});
