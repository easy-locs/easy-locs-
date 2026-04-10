import { describe, it, expect } from "vitest";

describe("SEPA Countries", () => {
  it("all EU countries are SEPA", async () => {
    const { isSepaCountry } = await import("@/lib/sepa-countries");
    const euCountries = ["FR", "DE", "ES", "IT", "NL", "BE", "PT", "AT", "IE", "FI", "LU"];
    for (const cc of euCountries) {
      expect(isSepaCountry(cc), `${cc} should be SEPA`).toBe(true);
    }
  });

  it("non-EU countries are not SEPA", async () => {
    const { isSepaCountry } = await import("@/lib/sepa-countries");
    const nonSepa = ["US", "JP", "BR", "IN", "AE", "CN", "AU"];
    for (const cc of nonSepa) {
      expect(isSepaCountry(cc), `${cc} should not be SEPA`).toBe(false);
    }
  });

  it("getAvailablePaymentMethods returns card for all", async () => {
    const { getAvailablePaymentMethods } = await import("@/lib/sepa-countries");
    expect(getAvailablePaymentMethods("US")).toContain("card");
    expect(getAvailablePaymentMethods("FR")).toContain("card");
  });
});
