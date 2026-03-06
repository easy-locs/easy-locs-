import { describe, it, expect } from "vitest";

describe("Country-Based Isolation Module", () => {

  // ─── CountryModule Registry ───
  describe("CountryModule Registry", () => {
    it("registers and retrieves France module", async () => {
      const { getCountryModule, getRegisteredCountries } = await import("@/lib/templates/country-module");
      const fr = getCountryModule("FR" as any);
      expect(fr).toBeDefined();
      expect(fr!.code).toBe("FR");
      expect(fr!.currency).toBe("EUR");
      expect(fr!.locale).toBe("fr-FR");
    });

    it("registers European country modules", async () => {
      const { getCountryModule } = await import("@/lib/templates/country-module");
      const countries = ["DE", "ES", "IT", "NL", "BE", "PT", "GB", "AT", "CH"] as const;
      for (const code of countries) {
        const mod = getCountryModule(code as any);
        expect(mod, `Module for ${code} should exist`).toBeDefined();
        expect(mod!.code).toBe(code);
      }
    });

    it("returns correct legal rules for France", async () => {
      const { getCountryModule } = await import("@/lib/templates/country-module");
      const fr = getCountryModule("FR" as any);
      expect(fr!.rules.minLeaseDuration.empty).toBe(36);
      expect(fr!.rules.minLeaseDuration.furnished).toBe(12);
      expect(fr!.rules.depositCap.empty).toBe(1);
      expect(fr!.rules.depositCap.furnished).toBe(2);
      expect(fr!.rules.rentIndexMethod).toBe("IRL");
      expect(fr!.rules.chargesRegularizationRequired).toBe(true);
    });

    it("validates France lease duration correctly", async () => {
      const { getCountryModule } = await import("@/lib/templates/country-module");
      const fr = getCountryModule("FR" as any);
      // Too short duration should return error
      const errors = fr!.validateLease({ leaseType: "empty", duration: 12 });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("36 mois");

      // Valid duration should return no error
      const ok = fr!.validateLease({ leaseType: "empty", duration: 36 });
      expect(ok.length).toBe(0);
    });

    it("validates France deposit cap correctly", async () => {
      const { getCountryModule } = await import("@/lib/templates/country-module");
      const fr = getCountryModule("FR" as any);
      const errors = fr!.validateLease({ leaseType: "empty", rentAmount: 1000, depositAmount: 1500 });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("dépôt de garantie");
    });

    it("GB uses imperial, others metric", async () => {
      const { getCountryModule } = await import("@/lib/templates/country-module");
      expect(getCountryModule("GB" as any)!.measurementUnit).toBe("imperial");
      expect(getCountryModule("FR" as any)!.measurementUnit).toBe("metric");
      expect(getCountryModule("DE" as any)!.measurementUnit).toBe("metric");
    });
  });

  // ─── CountryProfile (unified model) ───
  describe("CountryProfile", () => {
    it("builds profile for France with all fields", async () => {
      const { getCountryProfile } = await import("@/lib/country-profile");
      const p = getCountryProfile("FR");
      expect(p.code).toBe("FR");
      expect(p.currency).toBe("EUR");
      expect(p.currencySymbol).toBe("€");
      expect(p.locale).toContain("fr");
      expect(p.lease.minDuration.empty).toBe(36);
      expect(p.compliance.energyCertificateRequired).toBe(true);
      expect(p.compliance.tenantInsuranceRequired).toBe(true);
      expect(p.paymentMethods).toContain("sepa_direct_debit");
    });

    it("builds profile for GB with GBP and imperial", async () => {
      const { getCountryProfile } = await import("@/lib/country-profile");
      const p = getCountryProfile("GB");
      expect(p.currency).toBe("GBP");
      expect(p.currencySymbol).toBe("£");
      expect(p.measurementUnit).toBe("imperial");
      expect(p.compliance.depositRegistrationRequired).toBe(true);
    });

    it("builds profile for UAE with AED", async () => {
      const { getCountryProfile } = await import("@/lib/country-profile");
      const p = getCountryProfile("AE");
      expect(p.currency).toBe("AED");
      expect(p.compliance.energyCertificateRequired).toBe(false);
    });

    it("caches profiles on second call", async () => {
      const { getCountryProfile } = await import("@/lib/country-profile");
      const p1 = getCountryProfile("FR");
      const p2 = getCountryProfile("FR");
      expect(p1).toBe(p2); // same reference = cached
    });
  });

  // ─── Strict Isolation Guards ───
  describe("Isolation Guards", () => {
    it("assertTemplateCountryMatch throws on mismatch", async () => {
      const { assertTemplateCountryMatch, CountryIsolationError } = await import("@/lib/country-profile");
      const fakeTemplate = { id: "test", country: "DE", category: "lease" } as any;
      expect(() => assertTemplateCountryMatch("FR", fakeTemplate)).toThrow(CountryIsolationError);
    });

    it("assertTemplateCountryMatch passes on match", async () => {
      const { assertTemplateCountryMatch } = await import("@/lib/country-profile");
      const fakeTemplate = { id: "test", country: "FR", category: "lease" } as any;
      expect(() => assertTemplateCountryMatch("FR", fakeTemplate)).not.toThrow();
    });

    it("assertCurrencyMatch throws on wrong currency", async () => {
      const { assertCurrencyMatch, CountryIsolationError } = await import("@/lib/country-profile");
      expect(() => assertCurrencyMatch("FR", "GBP")).toThrow(CountryIsolationError);
    });

    it("assertCurrencyMatch passes on correct currency", async () => {
      const { assertCurrencyMatch } = await import("@/lib/country-profile");
      expect(() => assertCurrencyMatch("FR", "EUR")).not.toThrow();
      expect(() => assertCurrencyMatch("GB", "GBP")).not.toThrow();
    });

    it("assertAccountingCountryMatch throws on cross-country", async () => {
      const { assertAccountingCountryMatch, CountryIsolationError } = await import("@/lib/country-profile");
      expect(() => assertAccountingCountryMatch("FR", "DE")).toThrow(CountryIsolationError);
    });
  });

  // ─── Lease Validation per Country ───
  describe("validateLeaseForCountry", () => {
    it("rejects cross-country template usage", async () => {
      const { validateLeaseForCountry } = await import("@/lib/country-profile");
      const errors = validateLeaseForCountry("FR", { templateCountry: "DE" });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain("DE");
    });

    it("rejects wrong currency", async () => {
      const { validateLeaseForCountry } = await import("@/lib/country-profile");
      const errors = validateLeaseForCountry("FR", { currency: "GBP" });
      expect(errors.some(e => e.includes("EUR"))).toBe(true);
    });

    it("rejects too-short lease in France", async () => {
      const { validateLeaseForCountry } = await import("@/lib/country-profile");
      const errors = validateLeaseForCountry("FR", { leaseType: "empty", duration: 12 });
      expect(errors.some(e => e.includes("36"))).toBe(true);
    });

    it("accepts valid lease data", async () => {
      const { validateLeaseForCountry } = await import("@/lib/country-profile");
      const errors = validateLeaseForCountry("FR", {
        leaseType: "empty",
        duration: 36,
        currency: "EUR",
        templateCountry: "FR",
        rentAmount: 1000,
        depositAmount: 1000,
      });
      expect(errors.length).toBe(0);
    });
  });

  // ─── Currency Formatting ───
  describe("formatPropertyCurrency", () => {
    it("formats EUR for France", async () => {
      const { formatPropertyCurrency } = await import("@/lib/country-profile");
      const result = formatPropertyCurrency(1500, "FR");
      expect(result).toContain("1");
      expect(result).toContain("500");
    });

    it("formats GBP for UK", async () => {
      const { formatPropertyCurrency } = await import("@/lib/country-profile");
      const result = formatPropertyCurrency(1500, "GB");
      expect(result).toContain("£");
    });
  });

  // ─── SEPA Countries ───
  describe("SEPA Country Module", () => {
    it("France is SEPA", async () => {
      const { isSepaCountry } = await import("@/lib/sepa-countries");
      expect(isSepaCountry("FR")).toBe(true);
    });

    it("US is not SEPA", async () => {
      const { isSepaCountry } = await import("@/lib/sepa-countries");
      expect(isSepaCountry("US")).toBe(false);
    });

    it("payment methods include SEPA for FR", async () => {
      const { getAvailablePaymentMethods } = await import("@/lib/sepa-countries");
      const methods = getAvailablePaymentMethods("FR");
      expect(methods).toContain("sepa");
    });

    it("payment methods exclude SEPA for US", async () => {
      const { getAvailablePaymentMethods } = await import("@/lib/sepa-countries");
      const methods = getAvailablePaymentMethods("US");
      expect(methods).not.toContain("sepa");
    });
  });
});
