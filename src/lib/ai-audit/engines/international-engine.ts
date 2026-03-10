import type { AuditIssue } from "../types";

const REQUIRED_LOCALES = ["fr", "en", "es", "de", "it", "pt", "nl", "ar", "ja", "zh"];

/** International audit — language coverage, currency, timezone, localization */
export function runInternationalAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();
  let id = 0;
  const uid = () => `intl-${++id}`;

  if (typeof document === "undefined") return issues;

  // Check html lang attribute
  const htmlLang = document.documentElement.lang;
  if (!htmlLang || htmlLang === "en") {
    issues.push({
      id: uid(), category: "international", severity: "medium",
      title: "HTML lang attribute not set dynamically",
      description: "The <html> lang attribute should match the user's selected locale.",
      suggestedFix: "Sync document.documentElement.lang with the active locale.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  // Check for hardcoded English text in visible DOM
  const bodyText = document.body?.innerText || "";
  const hardcodedPatterns = [
    { pattern: /loading\.\.\./gi, label: "Loading..." },
    { pattern: /no data/gi, label: "No data" },
    { pattern: /click here/gi, label: "Click here" },
    { pattern: /submit/gi, label: "Submit" },
  ];

  const foundHardcoded: string[] = [];
  hardcodedPatterns.forEach(({ pattern, label }) => {
    if (htmlLang && htmlLang !== "en" && pattern.test(bodyText)) {
      foundHardcoded.push(label);
    }
  });

  if (foundHardcoded.length > 0) {
    issues.push({
      id: uid(), category: "international", severity: "medium",
      title: `${foundHardcoded.length} potentially untranslated string(s)`,
      description: `Found English text while locale is "${htmlLang}": ${foundHardcoded.join(", ")}`,
      suggestedFix: "Replace hardcoded text with t() translation hooks.",
      autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now,
    });
  }

  // Check dir attribute for RTL locales
  const rtlLocales = ["ar", "he"];
  if (rtlLocales.includes(htmlLang) && document.documentElement.dir !== "rtl") {
    issues.push({
      id: uid(), category: "international", severity: "high",
      title: "RTL direction not set",
      description: `Locale is "${htmlLang}" (RTL) but dir attribute is not "rtl".`,
      suggestedFix: "Set document.documentElement.dir = 'rtl' for RTL locales.",
      autoFixable: true, businessImpact: "usability", status: "open", detectedAt: now,
    });
  }

  // Check currency formatting
  const priceElements = document.querySelectorAll("[data-currency], [class*='price']");
  if (priceElements.length === 0) {
    issues.push({
      id: uid(), category: "international", severity: "low",
      title: "No currency-tagged price elements found",
      description: "Price elements should use data-currency for proper localization.",
      suggestedFix: "Add data-currency attributes to price display components.",
      autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now,
    });
  }

  // Check hreflang tags
  const hreflangs = document.querySelectorAll('link[rel="alternate"][hreflang]');
  if (hreflangs.length < 3) {
    issues.push({
      id: uid(), category: "international", severity: "medium",
      title: "Few or no hreflang tags",
      description: `Only ${hreflangs.length} hreflang tags found. Should cover major markets.`,
      suggestedFix: "Add hreflang tags for all supported languages to improve international SEO.",
      autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
    });
  }

  return issues;
}
