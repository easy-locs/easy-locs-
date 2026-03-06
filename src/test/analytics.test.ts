import { describe, it, expect } from "vitest";

describe("Analytics Module", () => {
  it("exports initAnalytics, trackPageView, trackEvent", async () => {
    const mod = await import("@/lib/analytics");
    expect(mod.initAnalytics).toBeDefined();
    expect(mod.trackPageView).toBeDefined();
    expect(mod.trackEvent).toBeDefined();
    expect(typeof mod.initAnalytics).toBe("function");
    expect(typeof mod.trackPageView).toBe("function");
    expect(typeof mod.trackEvent).toBe("function");
  });

  it("trackEvent does not throw without gtag", async () => {
    const { trackEvent } = await import("@/lib/analytics");
    expect(() => trackEvent("test_event", { value: 1 })).not.toThrow();
  });

  it("trackPageView does not throw without gtag", async () => {
    const { trackPageView } = await import("@/lib/analytics");
    expect(() => trackPageView("/test", "Test Page")).not.toThrow();
  });
});
