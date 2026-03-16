import { describe, it, expect, beforeEach } from "vitest";
import {
  setLocale, getLocale, setFallbackLocale,
  registerTranslations, t, clearCatalog,
  isRTL, getDirection,
  formatNumber, formatCurrency, formatPercent, formatDate,
  getAvailableLocales, hasTranslation,
} from "@/lib/i18n-engine";

describe("i18n Engine — AV", () => {
  beforeEach(() => clearCatalog());

  describe("Locale management", () => {
    it("defaults to en", () => {
      expect(getLocale()).toBe("en");
    });

    it("sets locale", () => {
      setLocale("fr-FR");
      expect(getLocale()).toBe("fr-FR");
    });
  });

  describe("RTL", () => {
    it("detects RTL locales", () => {
      expect(isRTL("ar")).toBe(true);
      expect(isRTL("ar-SA")).toBe(true);
      expect(isRTL("he")).toBe(true);
      expect(isRTL("en")).toBe(false);
    });

    it("getDirection returns rtl/ltr", () => {
      expect(getDirection("ar")).toBe("rtl");
      expect(getDirection("fr")).toBe("ltr");
    });
  });

  describe("Translation", () => {
    it("returns key if no translation", () => {
      expect(t("missing.key")).toBe("missing.key");
    });

    it("translates simple strings", () => {
      registerTranslations("en", { hello: "Hello!" });
      setLocale("en");
      expect(t("hello")).toBe("Hello!");
    });

    it("interpolates params", () => {
      registerTranslations("en", { greet: "Hello {{name}}!" });
      setLocale("en");
      expect(t("greet", { params: { name: "John" } })).toBe("Hello John!");
    });

    it("handles pluralization", () => {
      registerTranslations("en", {
        items: { one: "{{count}} item", other: "{{count}} items" },
      });
      setLocale("en");
      expect(t("items", { count: 1 })).toBe("1 item");
      expect(t("items", { count: 5 })).toBe("5 items");
    });

    it("falls back to fallback locale", () => {
      registerTranslations("en", { fallback: "Fallback value" });
      setFallbackLocale("en");
      setLocale("fr");
      expect(t("fallback")).toBe("Fallback value");
    });

    it("overrides with locale option", () => {
      registerTranslations("en", { word: "Word" });
      registerTranslations("fr", { word: "Mot" });
      setLocale("en");
      expect(t("word", { locale: "fr" })).toBe("Mot");
    });
  });

  describe("Catalog utils", () => {
    it("getAvailableLocales", () => {
      registerTranslations("en", { a: "A" });
      registerTranslations("fr", { a: "A" });
      expect(getAvailableLocales()).toContain("en");
      expect(getAvailableLocales()).toContain("fr");
    });

    it("hasTranslation", () => {
      registerTranslations("en", { exists: "yes" });
      setLocale("en");
      expect(hasTranslation("exists")).toBe(true);
      expect(hasTranslation("nope")).toBe(false);
    });
  });

  describe("Formatting", () => {
    it("formatNumber", () => {
      const r = formatNumber(1234.5, "en-US");
      expect(r).toContain("1");
    });

    it("formatCurrency", () => {
      const r = formatCurrency(99.99, "EUR", "fr-FR");
      expect(r).toContain("99,99");
    });

    it("formatPercent", () => {
      const r = formatPercent(0.75, "en-US");
      expect(r).toContain("75");
    });

    it("formatDate", () => {
      const r = formatDate("2025-06-15", "en-US");
      expect(r).toContain("2025");
    });
  });
});
