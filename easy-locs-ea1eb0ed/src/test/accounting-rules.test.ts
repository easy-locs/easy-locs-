import { describe, it, expect } from "vitest";

describe("Accounting Rules", () => {
  it("exports getAccountingRules for all major countries", async () => {
    const mod = await import("@/lib/accounting-rules");
    expect(mod.getAccountingRules).toBeDefined();

    const countries = ["FR", "DE", "ES", "IT", "GB", "US", "PT", "NL", "BE", "CH", "AT", "AE", "JP", "BR", "IN"];
    for (const cc of countries) {
      const rules = mod.getAccountingRules(cc);
      expect(rules, `Rules for ${cc}`).toBeDefined();
      expect(rules.country).toBe(cc);
      expect(rules.currency.length).toBe(3);
      expect(rules.currencySymbol.length).toBeGreaterThan(0);
      expect(rules.deductibleCategories.length).toBeGreaterThan(0);
      expect(["monthly", "quarterly", "annual"]).toContain(rules.reportingFrequency);
    }
  });

  it("FR has correct fiscal specifics", async () => {
    const { getAccountingRules } = await import("@/lib/accounting-rules");
    const fr = getAccountingRules("FR");
    expect(fr.socialCharges).toBe(17.2);
    expect(fr.vatApplicable).toBe(false);
    expect(fr.propertyTax).toBe(true);
    expect(fr.capitalGainsTax?.rate).toBe(19);
    expect(fr.categoryLabels.rent).toBe("Loyer");
  });

  it("US has USD and annual reporting", async () => {
    const { getAccountingRules } = await import("@/lib/accounting-rules");
    const us = getAccountingRules("US");
    expect(us.currency).toBe("USD");
    expect(us.reportingFrequency).toBe("annual");
  });

  it("AE has no rental income tax", async () => {
    const { getAccountingRules } = await import("@/lib/accounting-rules");
    const ae = getAccountingRules("AE");
    expect(ae.rentalIncomeTax.type).toBe("exempt");
    expect(ae.currency).toBe("AED");
  });
});
