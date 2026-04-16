import { describe, it, expect } from "vitest";
import { ALL_TRANSLATIONS, APP_LOCALES, DOMAIN_DICTIONARIES } from "./i18n-canonical";
import type { AppLocale } from "./i18n-canonical";

const REFERENCE_LOCALE: AppLocale = "en";

describe("i18n translation key coverage", () => {
  const domainNames = Object.keys(DOMAIN_DICTIONARIES);
  const enKeys = Object.keys(ALL_TRANSLATIONS[REFERENCE_LOCALE]);

  it("English locale has translations", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it("has at least 20 domains", () => {
    expect(domainNames.length).toBeGreaterThanOrEqual(20);
  });

  it("all APP_LOCALES entries exist in ALL_TRANSLATIONS", () => {
    for (const locale of APP_LOCALES) {
      expect(ALL_TRANSLATIONS[locale], `"${locale}" missing from ALL_TRANSLATIONS`).toBeDefined();
    }
  });

  for (const [domainName, domainDict] of Object.entries(DOMAIN_DICTIONARIES)) {
    const enDomainKeys = Object.keys(domainDict[REFERENCE_LOCALE] ?? {}).sort();
    const domainLocales = APP_LOCALES.filter(
      (l) => l !== REFERENCE_LOCALE && domainDict[l] !== undefined,
    );

    if (enDomainKeys.length === 0) continue;

    describe(`domain "${domainName}" (${enDomainKeys.length} en keys, ${domainLocales.length} locales)`, () => {
      it("English has keys", () => {
        expect(enDomainKeys.length).toBeGreaterThan(0);
      });

      describe.each(domainLocales)("locale '%s'", (locale) => {
        it("has the same keys as English (no missing, no extra)", () => {
          const localeKeys = Object.keys(domainDict[locale] ?? {}).sort();
          const enKeySet = new Set(enDomainKeys);
          const localeKeySet = new Set(localeKeys);

          const missing = enDomainKeys.filter((k) => !localeKeySet.has(k));
          const extra = localeKeys.filter((k) => !enKeySet.has(k));

          const details: string[] = [];
          if (missing.length > 0) {
            details.push(`MISSING (${missing.length}): ${missing.join(", ")}`);
          }
          if (extra.length > 0) {
            details.push(`EXTRA (${extra.length}): ${extra.join(", ")}`);
          }

          expect(
            missing.length + extra.length,
            `Domain "${domainName}", locale "${locale}" key mismatch:\n  ${details.join("\n  ")}`,
          ).toBe(0);
        });

        it("has no empty translation values", () => {
          const localeDict = domainDict[locale] ?? {};
          const emptyKeys = Object.entries(localeDict)
            .filter(([, v]) => typeof v === "string" && v.trim() === "")
            .map(([k]) => k);

          expect(
            emptyKeys.length,
            `Domain "${domainName}", locale "${locale}" has ${emptyKeys.length} empty values: ${emptyKeys.join(", ")}`,
          ).toBe(0);
        });
      });
    });
  }
});
