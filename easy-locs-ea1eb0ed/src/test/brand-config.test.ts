import { describe, it, expect } from "vitest";

describe("Brand Config", () => {
  it("exports BRAND with required fields", async () => {
    const { BRAND } = await import("@/lib/brand-config");
    expect(BRAND.name).toBe("EASY-LOCS®");
    expect(BRAND.nameShort).toBe("Easy-Locs");
    expect(BRAND.email.from).toContain("@easy-locs.com");
    expect(BRAND.email.replyTo).toContain("@easy-locs.com");
    expect(BRAND.colors.primary).toBeDefined();
    expect(BRAND.colors.gold).toBeDefined();
    expect(BRAND.pdf.colorPrimary).toHaveLength(3);
    expect(BRAND.urls.app).toContain("easy-locs.com");
  });

  it("brandedEmailHtml generates valid HTML", async () => {
    const { brandedEmailHtml, BRAND } = await import("@/lib/brand-config");
    const html = brandedEmailHtml("<p>Test content</p>");
    expect(html).toContain("Test content");
    expect(html).toContain(BRAND.name);
    expect(html).toContain(BRAND.colors.primary);
  });

  it("brandedEmailHtml accepts custom footer", async () => {
    const { brandedEmailHtml } = await import("@/lib/brand-config");
    const html = brandedEmailHtml("<p>Body</p>", "Custom footer");
    expect(html).toContain("Custom footer");
  });

  it("emailButton generates CTA link", async () => {
    const { emailButton, BRAND } = await import("@/lib/brand-config");
    const btn = emailButton("Click me", "https://example.com");
    expect(btn).toContain("Click me");
    expect(btn).toContain("https://example.com");
    expect(btn).toContain(BRAND.colors.gold);
  });
});
