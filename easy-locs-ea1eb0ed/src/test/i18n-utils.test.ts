import { describe, it, expect } from "vitest";
import {
  interpolate,
  getPluralKey,
  resolvePlural,
  isRTL,
  getDirection,
  formatNumber,
  formatCurrency,
  formatPercent,
  trackMissingKey,
  getMissingKeysReport,
  clearMissingKeys,
} from "@/lib/i18n-utils";

describe("i18n-utils", () => {
  describe("interpolate", () => {
    it("replaces {{var}} placeholders", () => {
      expect(interpolate("Hello {{name}}!", { name: "Alice" })).toBe("Hello Alice!");
    });

    it("handles multiple placeholders", () => {
      expect(interpolate("{{a}} and {{b}}", { a: "X", b: "Y" })).toBe("X and Y");
    });

    it("keeps unknown placeholders", () => {
      expect(interpolate("Hello {{name}}", {})).toBe("Hello {{name}}");
    });

    it("returns template when no vars", () => {
      expect(interpolate("No vars here")).toBe("No vars here");
    });

    it("handles number values", () => {
      expect(interpolate("Count: {{count}}", { count: 42 })).toBe("Count: 42");
    });
  });

  describe("pluralization", () => {
    it("returns _zero for count 0", () => {
      expect(getPluralKey("item", 0)).toBe("item_zero");
    });

    it("returns _one for count 1", () => {
      expect(getPluralKey("item", 1)).toBe("item_one");
    });

    it("returns _other for count > 1", () => {
      expect(getPluralKey("item", 5)).toBe("item_other");
    });

    it("resolvePlural picks correct form", () => {
      const dict: Record<string, string> = {
        "item_zero": "No items",
        "item_one": "1 item",
        "item_other": "{{count}} items",
      };
      expect(resolvePlural("item", 0, (k) => dict[k])).toBe("No items");
      expect(resolvePlural("item", 1, (k) => dict[k])).toBe("1 item");
      expect(resolvePlural("item", 5, (k) => dict[k])).toBe("{{count}} items");
    });

    it("resolvePlural falls back to _other then base", () => {
      const dict: Record<string, string> = { "item": "items" };
      expect(resolvePlural("item", 3, (k) => dict[k])).toBe("items");
    });
  });

  describe("RTL detection", () => {
    it("detects Arabic as RTL", () => {
      expect(isRTL("ar")).toBe(true);
      expect(getDirection("ar")).toBe("rtl");
    });

    it("detects Hebrew as RTL", () => {
      expect(isRTL("he")).toBe(true);
    });

    it("detects French as LTR", () => {
      expect(isRTL("fr")).toBe(false);
      expect(getDirection("fr")).toBe("ltr");
    });
  });

  describe("formatters", () => {
    it("formats numbers with locale", () => {
      const result = formatNumber(1234.5, "en");
      expect(result).toContain("1");
      expect(result).toContain("234");
    });

    it("formats currency", () => {
      const result = formatCurrency(99.99, "en", "USD");
      expect(result).toContain("99");
      expect(result).toContain("$");
    });

    it("formats percent", () => {
      const result = formatPercent(0.75, "en");
      expect(result).toContain("75");
      expect(result).toContain("%");
    });
  });

  describe("missing key tracker", () => {
    it("tracks and reports missing keys", () => {
      clearMissingKeys();
      trackMissingKey("test.key", "fr");
      trackMissingKey("test.key", "en");
      trackMissingKey("other.key", "fr");

      const report = getMissingKeysReport();
      expect(report.length).toBe(2);

      const testEntry = report.find(r => r.key === "test.key");
      expect(testEntry?.count).toBe(2);
      expect(testEntry?.locales).toContain("fr");
      expect(testEntry?.locales).toContain("en");

      clearMissingKeys();
      expect(getMissingKeysReport().length).toBe(0);
    });
  });
});
