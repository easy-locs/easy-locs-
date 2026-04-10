/**
 * Advanced i18n Tests
 */
import { describe, it, expect } from "vitest";
import {
  negotiateLocale,
  toBCP47,
  SUPPORTED_LOCALES,
  RTL_LOCALES,
  getPluralCategory,
  formatOrdinal,
  formatList,
  formatCompactNumber,
  timeAgo,
  getMonthName,
  getDayName,
  bidiWrap,
  hasRTLChars,
  formatUnit,
  nsKey,
  extractNamespace,
} from "@/lib/i18n-advanced";
import {
  interpolate,
  getPluralKey,
  resolvePlural,
  isRTL,
  getDirection,
  formatNumber,
  formatCurrency,
  formatDate,
  formatPercent,
  trackMissingKey,
  getMissingKeysReport,
  clearMissingKeys,
} from "@/lib/i18n-utils";

/* ── Locale Negotiation ── */
describe("negotiateLocale", () => {
  it("matches exact locale", () => {
    expect(negotiateLocale(["fr"])).toBe("fr");
    expect(negotiateLocale(["en"])).toBe("en");
  });

  it("matches language prefix", () => {
    expect(negotiateLocale(["pt-BR"])).toBe("pt");
    expect(negotiateLocale(["fr-CA"])).toBe("fr");
  });

  it("falls back to default", () => {
    expect(negotiateLocale(["xx-YY"])).toBe("fr");
    expect(negotiateLocale(["xx"], "en")).toBe("en");
  });

  it("picks first matching from list", () => {
    expect(negotiateLocale(["xx", "de", "fr"])).toBe("de");
  });
});

describe("toBCP47", () => {
  it("maps nb to nb-NO", () => {
    expect(toBCP47("nb")).toBe("nb-NO");
  });

  it("passes through standard codes", () => {
    expect(toBCP47("fr")).toBe("fr");
    expect(toBCP47("en")).toBe("en");
  });
});

describe("SUPPORTED_LOCALES", () => {
  it("has 31 locales", () => {
    expect(SUPPORTED_LOCALES.length).toBe(31);
  });

  it("includes core languages", () => {
    expect(SUPPORTED_LOCALES).toContain("fr");
    expect(SUPPORTED_LOCALES).toContain("en");
    expect(SUPPORTED_LOCALES).toContain("ar");
    expect(SUPPORTED_LOCALES).toContain("ja");
  });
});

/* ── Interpolation (from i18n-utils) ── */
describe("interpolate", () => {
  it("replaces variables", () => {
    expect(interpolate("Hello {{name}}", { name: "John" })).toBe("Hello John");
  });

  it("handles multiple variables", () => {
    expect(interpolate("{{a}} + {{b}}", { a: 1, b: 2 })).toBe("1 + 2");
  });

  it("preserves unknown placeholders", () => {
    expect(interpolate("Hi {{name}}", {})).toBe("Hi {{name}}");
  });

  it("returns template without vars", () => {
    expect(interpolate("plain text")).toBe("plain text");
  });
});

/* ── Pluralization ── */
describe("getPluralKey", () => {
  it("zero → key_zero", () => expect(getPluralKey("item", 0)).toBe("item_zero"));
  it("one → key_one", () => expect(getPluralKey("item", 1)).toBe("item_one"));
  it("other → key_other", () => expect(getPluralKey("item", 5)).toBe("item_other"));
});

describe("resolvePlural", () => {
  const dict: Record<string, string> = {
    item_zero: "aucun",
    item_one: "un élément",
    item_other: "{{count}} éléments",
  };
  const lookup = (k: string) => dict[k];

  it("resolves zero", () => expect(resolvePlural("item", 0, lookup)).toBe("aucun"));
  it("resolves one", () => expect(resolvePlural("item", 1, lookup)).toBe("un élément"));
  it("resolves other", () => expect(resolvePlural("item", 5, lookup)).toBe("{{count}} éléments"));
});

describe("getPluralCategory (CLDR)", () => {
  it("returns 'one' for 1 in French", () => {
    expect(getPluralCategory(1, "fr")).toBe("one");
  });

  it("returns 'other' for 0 in French", () => {
    expect(getPluralCategory(0, "fr")).toBe("one"); // French: 0 = "one"
  });

  it("returns 'other' for 5 in English", () => {
    expect(getPluralCategory(5, "en")).toBe("other");
  });
});

/* ── RTL ── */
describe("RTL", () => {
  it("detects RTL locales", () => {
    expect(isRTL("ar" as any)).toBe(true);
    expect(isRTL("he" as any)).toBe(true);
    expect(isRTL("fr" as any)).toBe(false);
  });

  it("getDirection returns rtl/ltr", () => {
    expect(getDirection("ar" as any)).toBe("rtl");
    expect(getDirection("en" as any)).toBe("ltr");
  });

  it("RTL_LOCALES set is correct", () => {
    expect(RTL_LOCALES.has("ar")).toBe(true);
    expect(RTL_LOCALES.has("fa")).toBe(true);
    expect(RTL_LOCALES.has("fr")).toBe(false);
  });

  it("hasRTLChars detects Arabic", () => {
    expect(hasRTLChars("مرحبا")).toBe(true);
    expect(hasRTLChars("שלום")).toBe(true);
    expect(hasRTLChars("Hello")).toBe(false);
  });

  it("bidiWrap adds markers", () => {
    const wrapped = bidiWrap("test", "rtl");
    expect(wrapped).toContain("\u200F");
    const ltrWrapped = bidiWrap("test", "ltr");
    expect(ltrWrapped).toContain("\u200E");
  });
});

/* ── Ordinals ── */
describe("formatOrdinal", () => {
  it("English ordinals", () => {
    expect(formatOrdinal(1, "en")).toBe("1st");
    expect(formatOrdinal(2, "en")).toBe("2nd");
    expect(formatOrdinal(3, "en")).toBe("3rd");
    expect(formatOrdinal(4, "en")).toBe("4th");
  });

  it("French ordinals", () => {
    expect(formatOrdinal(1, "fr")).toBe("1er");
    expect(formatOrdinal(2, "fr")).toBe("2e");
  });

  it("fallback for unsupported locale", () => {
    expect(formatOrdinal(1, "xx")).toBe("1.");
  });
});

/* ── List Formatting ── */
describe("formatList", () => {
  it("formats conjunction", () => {
    const result = formatList(["A", "B", "C"], "en");
    expect(result).toContain("A");
    expect(result).toContain("C");
  });

  it("handles single item", () => {
    expect(formatList(["solo"], "en")).toBe("solo");
  });

  it("handles empty", () => {
    expect(formatList([], "en")).toBe("");
  });
});

/* ── Compact Numbers ── */
describe("formatCompactNumber", () => {
  it("formats thousands", () => {
    const result = formatCompactNumber(1500, "en");
    expect(result).toMatch(/1\.5K|1,5\s?K|1\.5\s?K/i);
  });

  it("formats millions", () => {
    const result = formatCompactNumber(2_500_000, "en");
    expect(result).toMatch(/2\.5M|2,5\s?M/i);
  });
});

/* ── Formatters (from i18n-utils) ── */
describe("formatNumber", () => {
  it("formats with locale", () => {
    const result = formatNumber(1234.5, "fr");
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatCurrency", () => {
  it("formats EUR in French", () => {
    const result = formatCurrency(42.5, "fr", "EUR");
    expect(result).toContain("42");
  });

  it("formats USD in English", () => {
    const result = formatCurrency(100, "en-US", "USD");
    expect(result).toContain("100");
  });
});

describe("formatDate", () => {
  it("formats a date", () => {
    const result = formatDate(new Date(2024, 0, 15), "fr", { day: "numeric", month: "long" });
    expect(result).toContain("15");
    expect(result.toLowerCase()).toContain("janvier");
  });
});

describe("formatPercent", () => {
  it("formats percentage", () => {
    const result = formatPercent(0.85, "en");
    expect(result).toContain("85");
  });
});

/* ── Time Ago ── */
describe("timeAgo", () => {
  it("handles recent past", () => {
    const result = timeAgo(new Date(Date.now() - 30_000), "en");
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles string dates", () => {
    const result = timeAgo("2020-01-01", "fr");
    expect(result.length).toBeGreaterThan(0);
  });
});

/* ── Date Parts ── */
describe("getMonthName", () => {
  it("January in French", () => {
    expect(getMonthName(1, "fr").toLowerCase()).toBe("janvier");
  });

  it("short format", () => {
    const result = getMonthName(3, "en", "short");
    expect(result).toBe("Mar");
  });
});

describe("getDayName", () => {
  it("Monday in French", () => {
    expect(getDayName(1, "fr").toLowerCase()).toBe("lundi");
  });
});

/* ── Unit Formatting ── */
describe("formatUnit", () => {
  it("formats kilometers", () => {
    const result = formatUnit(5, "kilometer", "en");
    expect(result).toContain("5");
    expect(result.toLowerCase()).toMatch(/km|kilometer/);
  });
});

/* ── Namespace Keys ── */
describe("nsKey / extractNamespace", () => {
  it("creates qualified key", () => {
    expect(nsKey("dashboard", "title")).toBe("dashboard.title");
  });

  it("extracts namespace", () => {
    const { namespace, key } = extractNamespace("dashboard.title");
    expect(namespace).toBe("dashboard");
    expect(key).toBe("title");
  });

  it("handles no namespace", () => {
    const { namespace, key } = extractNamespace("title");
    expect(namespace).toBe("");
    expect(key).toBe("title");
  });
});

/* ── Missing Key Tracker ── */
describe("Missing Key Tracker", () => {
  it("tracks and reports missing keys", () => {
    clearMissingKeys();
    trackMissingKey("test.key1", "fr");
    trackMissingKey("test.key1", "en");
    trackMissingKey("test.key2", "fr");
    const report = getMissingKeysReport();
    expect(report.length).toBe(2);
    const k1 = report.find((r) => r.key === "test.key1");
    expect(k1?.count).toBe(2);
    expect(k1?.locales).toContain("fr");
    expect(k1?.locales).toContain("en");
    clearMissingKeys();
  });
});
