import { describe, it, expect } from "vitest";
import {
  getPluralCategory, pluralize, formatNumber, formatCurrency,
  formatPercent, formatCompact, isRTL, getDirection, interpolate,
} from "@/lib/i18n-engine";

describe("Pluralization", () => {
  it("returns 'one' for 1", () => {
    expect(getPluralCategory(1, "en")).toBe("one");
  });
  it("returns 'other' for 0 in English", () => {
    expect(getPluralCategory(0, "en")).toBe("other");
  });
  it("pluralize replaces {count}", () => {
    const rules = { one: "{count} item", other: "{count} items" };
    expect(pluralize(1, rules, "en")).toBe("1 item");
    expect(pluralize(5, rules, "en")).toBe("5 items");
  });
});

describe("Number Formatting", () => {
  it("formats numbers with locale", () => {
    expect(formatNumber(1234.5, "en-US")).toContain("1");
  });
  it("formats currency", () => {
    const r = formatCurrency(42.5, "EUR", "fr-FR");
    expect(r).toContain("42");
  });
  it("formats percent", () => {
    expect(formatPercent(0.85, "en", 0)).toContain("85");
  });
  it("formats compact", () => {
    expect(formatCompact(1500, "en")).toMatch(/1\.?5?K?/i);
  });
});

describe("RTL Support", () => {
  it("detects RTL locales", () => {
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("he")).toBe(true);
    expect(isRTL("fr")).toBe(false);
  });
  it("returns correct direction", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
  });
});

describe("Interpolation", () => {
  it("replaces placeholders", () => {
    expect(interpolate("Hello {name}, you have {count} items", { name: "Alice", count: 3 }))
      .toBe("Hello Alice, you have 3 items");
  });
  it("keeps unknown placeholders", () => {
    expect(interpolate("{unknown}", {})).toBe("{unknown}");
  });
});
