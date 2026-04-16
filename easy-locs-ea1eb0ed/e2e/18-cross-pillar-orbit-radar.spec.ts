import { test, expect } from "@playwright/test";

test.describe("Cross-Pillar: Orbit ↔ Radar", () => {
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

  test("orbit:thread_created invalidates radar-listings cache", async ({ page }) => {
    const invalidated = await page.evaluate(() => {
      const keys: string[] = [];
      const orig = (window as any).__queryClient__?.invalidateQueries;
      if (!orig) return keys;
      (window as any).__queryClient__.invalidateQueries = (opts: any) => {
        if (opts?.queryKey?.[0]) keys.push(opts.queryKey[0]);
        return orig.call((window as any).__queryClient__, opts);
      };
      const bus = (window as any).__platformBus__;
      if (bus) bus.emit("orbit:thread_created", { threadId: "e2e-thread-001" }, "e2e");
      (window as any).__queryClient__.invalidateQueries = orig;
      return keys;
    });
    expect(invalidated).toContain("threads");
    expect(invalidated).toContain("radar-listings");
  });

  test("radar:location_shared emits tracking:started via bridge", async ({ page }) => {
    const events = await page.evaluate(async () => {
      const captured: string[] = [];
      const bus = (window as any).__platformBus__;
      if (!bus) return captured;
      bus.on("tracking:started", () => captured.push("tracking:started"));
      bus.on("radar:location_shared", () => captured.push("radar:location_shared"));
      bus.emit("radar:location_shared", {
        userId: "e2e-user-001",
        position: { lat: 25.276987, lng: 55.296249 },
        contextType: "delivery",
        contextId: "e2e-delivery-001",
        durationMinutes: 30,
        live: true,
      }, "e2e");
      await new Promise((r) => setTimeout(r, 200));
      return captured;
    });
    expect(events).toContain("radar:location_shared");
    expect(events).toContain("tracking:started");
  });
});
