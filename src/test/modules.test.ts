import { describe, it, expect } from "vitest";

describe("PDF Report module", () => {
  it("exports downloadFinancialPDF function", async () => {
    const mod = await import("@/lib/pdf-report");
    expect(mod.downloadFinancialPDF).toBeDefined();
    expect(typeof mod.downloadFinancialPDF).toBe("function");
  });

  it("exports generateFinancialPDF function", async () => {
    const mod = await import("@/lib/pdf-report");
    expect(mod.generateFinancialPDF).toBeDefined();
  });
});

describe("Web Vitals module", () => {
  it("exports initWebVitals function", async () => {
    const mod = await import("@/lib/web-vitals");
    expect(mod.initWebVitals).toBeDefined();
    expect(typeof mod.initWebVitals).toBe("function");
  });

  it("does not throw when called", async () => {
    const mod = await import("@/lib/web-vitals");
    expect(() => mod.initWebVitals()).not.toThrow();
  });
});
