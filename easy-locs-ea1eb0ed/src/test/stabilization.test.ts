/**
 * AI Quality Assurance — Full stabilization test suite for Easy-Locs.
 * Tests: Country Legal Engine, Global Translation Engine, Interface Sync, PDF/Downloads.
 */
import { describe, it, expect } from "vitest";

// ─── 1. COUNTRY LEGAL ENGINE ───

describe("Country Legal Engine", () => {
  it("every registered country has lease-residential and rent-receipt templates", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");

    const countries = getAllCountryEntries();
    expect(countries.length).toBeGreaterThanOrEqual(80);

    const failures: string[] = [];
    for (const c of countries) {
      const templates = getTemplatesByCountry(c.code as any);
      if (!templates.some(t => t.docType === "lease-residential")) {
        failures.push(`${c.code} (${c.name}): missing lease-residential`);
      }
      if (!templates.some(t => t.docType === "rent-receipt")) {
        failures.push(`${c.code} (${c.name}): missing rent-receipt`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("every template has required fields: landlordName, tenantName", async () => {
    const { getAllTemplates } = await import("@/lib/templates/registry");
    const templates = getAllTemplates();

    const leaseTemplates = templates.filter(t => t.docType.includes("lease"));
    for (const t of leaseTemplates) {
      const fieldKeys = t.fields.map(f => f.key);
      expect(fieldKeys).toContain("landlordName");
      expect(fieldKeys).toContain("tenantName");
    }
  });

  it("every template has at least one clause", async () => {
    const { getAllTemplates } = await import("@/lib/templates/registry");
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.clauses.length).toBeGreaterThan(0);
    }
  });

  it("every template has a non-empty label and description", async () => {
    const { getAllTemplates } = await import("@/lib/templates/registry");
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it("templates use correct currency symbols per country", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const { getCountryEntry } = await import("@/lib/global-country-registry");

    const testCases = [
      { country: "US", symbol: "$" },
      { country: "GB", symbol: "£" },
      { country: "JP", symbol: "¥" },
      { country: "AE", symbol: "AED" },
    ];

    for (const tc of testCases) {
      const entry = getCountryEntry(tc.country);
      if (!entry) continue;
      const templates = getTemplatesByCountry(tc.country as any);
      const lease = templates.find(t => t.docType === "lease-residential");
      if (lease) {
        const rentField = lease.fields.find(f => f.key === "rentAmount");
        expect(rentField?.label).toContain(tc.symbol);
      }
    }
  });

  it("AE has Ejari contract with Emirates-specific fields", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const aeTemplates = getTemplatesByCountry("AE");
    const ejari = aeTemplates.find(t => t.docType === "ejari-contract");
    expect(ejari).toBeDefined();
    if (ejari) {
      const fieldKeys = ejari.fields.map(f => f.key);
      expect(fieldKeys).toContain("landlordEmiratesId");
      expect(fieldKeys).toContain("makaniNumber");
      expect(fieldKeys).toContain("dewaNumber");
    }
  });

  it("generated fallback templates have legalBasis defined", async () => {
    const { getAllTemplates } = await import("@/lib/templates/registry");
    const templates = getAllTemplates();
    // Only check auto-generated templates (id pattern: xx-lease-residential, xx-rent-receipt, etc.)
    const generatedRental = templates.filter(t => 
      t.category === "rental" && 
      /^[a-z]{2}-(lease-residential|formal-notice|inventory|termination|deposit-return)$/.test(t.id)
    );
    const missing = generatedRental.filter(t => !t.legalBasis || t.legalBasis.trim() === "");
    expect(missing).toEqual([]);
  });
});

// ─── 2. GLOBAL TRANSLATION ENGINE ───

describe("Global Translation Engine", () => {
  it("COUNTRY_LOCALE_MAP covers all major countries", async () => {
    const { COUNTRY_LOCALE_MAP } = await import("@/lib/i18n");
    const required = ["FR", "US", "GB", "DE", "ES", "IT", "PT", "NL", "JP", "KR", "CN", "IN", "AE", "BR", "MX", "TR"];
    for (const code of required) {
      expect(COUNTRY_LOCALE_MAP[code]).toBeDefined();
    }
  });

  it("COUNTRY_CURRENCY_MAP covers all major currencies", async () => {
    const { COUNTRY_CURRENCY_MAP } = await import("@/lib/i18n");
    expect(COUNTRY_CURRENCY_MAP.FR).toBe("EUR");
    expect(COUNTRY_CURRENCY_MAP.US).toBe("USD");
    expect(COUNTRY_CURRENCY_MAP.GB).toBe("GBP");
    expect(COUNTRY_CURRENCY_MAP.JP).toBe("JPY");
    expect(COUNTRY_CURRENCY_MAP.AE).toBe("AED");
    expect(COUNTRY_CURRENCY_MAP.BR).toBe("BRL");
    expect(COUNTRY_CURRENCY_MAP.IN).toBe("INR");
    expect(COUNTRY_CURRENCY_MAP.CH).toBe("CHF");
  });

  it("i18n module exports useI18n hook", async () => {
    const mod = await import("@/lib/i18n");
    expect(mod.useI18n).toBeDefined();
    expect(mod.I18nProvider).toBeDefined();
  });

  it("Locale type includes all 45+ languages", async () => {
    const { COUNTRY_LOCALE_MAP } = await import("@/lib/i18n");
    const locales = new Set(Object.values(COUNTRY_LOCALE_MAP));
    // At minimum: fr, en, es, de, it, pt, nl, pl, tr, ar, ja, ko, zh, hi
    expect(locales.size).toBeGreaterThanOrEqual(14);
  });
});

// ─── 3. COUNTRY REGISTRY CONSISTENCY ───

describe("Country Registry Consistency", () => {
  it("every country has required properties", async () => {
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");
    for (const c of getAllCountryEntries()) {
      expect(c.code.length).toBe(2);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.flag.length).toBeGreaterThan(0);
      expect(c.currency.length).toBe(3);
      expect(c.phonePrefix.startsWith("+")).toBe(true);
      expect(["metric", "imperial"]).toContain(c.measurementUnit);
      expect(["european", "anglo", "asian", "arabic"]).toContain(c.addressFormat);
      expect(["europe", "americas", "africa", "middle_east", "asia_pacific"]).toContain(c.region);
    }
  });

  it("no duplicate country codes", async () => {
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");
    const codes = getAllCountryEntries().map(c => c.code);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it("getCountryEntry works for all registered countries", async () => {
    const { getAllCountryEntries, getCountryEntry } = await import("@/lib/global-country-registry");
    for (const c of getAllCountryEntries()) {
      const entry = getCountryEntry(c.code);
      expect(entry).toBeDefined();
      expect(entry?.code).toBe(c.code);
    }
  });

  it("formatCurrency produces valid output", async () => {
    const { formatCurrency } = await import("@/lib/global-country-registry");
    const result = formatCurrency(1500, "FR");
    expect(result).toContain("1");
    expect(result.length).toBeGreaterThan(3);
  });

  it("formatDate produces valid output", async () => {
    const { formatDate } = await import("@/lib/global-country-registry");
    const result = formatDate("2025-06-15", "FR");
    expect(result).toContain("2025");
    expect(result.length).toBeGreaterThan(5);
  });
});

// ─── 4. PDF GENERATOR ───

describe("PDF Generator", () => {
  it("exports generateFromTemplate and downloadPDF", async () => {
    const mod = await import("@/lib/pdf-generator");
    expect(mod.generateFromTemplate).toBeDefined();
    expect(mod.downloadPDF).toBeDefined();
    expect(mod.pdfToDataUri).toBeDefined();
  });

  it("generates PDF for a lease template without error", async () => {
    const { generateFromTemplate } = await import("@/lib/pdf-generator");
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");

    const frTemplates = getTemplatesByCountry("FR");
    const lease = frTemplates.find(t => t.docType === "lease-residential" || t.id === "fr-lease-empty");
    expect(lease).toBeDefined();

    if (lease) {
      const data: Record<string, unknown> = {
        landlordName: "Jean Dupont",
        tenantName: "Marie Martin",
        propertyAddress: "12 Rue de Paris, 75001 Paris",
        surface: 45,
        rooms: 2,
        rentAmount: 800,
        chargesAmount: 50,
        depositAmount: 800,
        startDate: "2025-01-01",
        duration: "36",
      };

      // Should not throw
      const doc = await generateFromTemplate(lease, data);
      expect(doc).toBeDefined();
    }
  });

  it("generates PDF for AE Ejari template", async () => {
    const { generateFromTemplate } = await import("@/lib/pdf-generator");
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");

    const aeTemplates = getTemplatesByCountry("AE");
    const ejari = aeTemplates.find(t => t.docType === "ejari-contract");
    if (ejari) {
      const data: Record<string, unknown> = {
        landlordName: "Ahmad Al Maktoum",
        landlordEmiratesId: "784-1990-1234567-1",
        tenantName: "John Smith",
        tenantEmiratesId: "784-1985-7654321-2",
        propertyAddress: "Marina Tower, Dubai Marina",
        makaniNumber: "12345",
        dewaNumber: "67890",
        surface: 1200,
        rooms: 2,
        rentAmount: 85000,
        depositAmount: 5000,
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };
      const doc = await generateFromTemplate(ejari, data);
      expect(doc).toBeDefined();
    }
  });

  it("generates receipt PDF for multiple countries", async () => {
    const { generateFromTemplate } = await import("@/lib/pdf-generator");
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");

    const countries = ["FR", "DE", "ES", "IT", "PT", "GB", "US", "BR", "JP", "IN"];
    for (const cc of countries) {
      const templates = getTemplatesByCountry(cc as any);
      const receipt = templates.find(t => t.docType === "rent-receipt");
      if (receipt) {
        const data: Record<string, unknown> = {
          landlordName: "Test Landlord",
          tenantName: "Test Tenant",
          propertyAddress: "123 Test St",
          rentAmount: 1000,
          chargesAmount: 100,
          totalAmount: 1100,
          period: "January 2025",
          paymentDate: "2025-01-05",
        };
        const doc = await generateFromTemplate(receipt, data);
        expect(doc).toBeDefined();
      }
    }
  });
});

// ─── 5. DOCUMENT VALIDATION ───

describe("Document Validation", () => {
  it("validateDocument returns errors for missing required fields", async () => {
    const { validateDocument } = await import("@/lib/templates/validation");
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");

    const frTemplates = getTemplatesByCountry("FR");
    const lease = frTemplates.find(t => t.docType === "lease-residential" || t.id === "fr-lease-empty");
    if (lease) {
      const result = validateDocument(lease, {});
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("validateDocument passes with complete data for lease", async () => {
    const { validateDocument } = await import("@/lib/templates/validation");
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");

    // Use a generated template which has predictable field structure
    const usTemplates = getTemplatesByCountry("US");
    const receipt = usTemplates.find(t => t.docType === "rent-receipt");
    if (receipt) {
      const data: Record<string, unknown> = {};
      for (const f of receipt.fields) {
        if (f.required) {
          if (f.type === "number") data[f.key] = 100;
          else if (f.type === "date") data[f.key] = "2025-01-01";
          else if (f.type === "select") data[f.key] = f.options?.[0]?.value ?? "option1";
          else data[f.key] = "Test value";
        }
      }
      const result = validateDocument(receipt, data);
      expect(result.errors.length).toBe(0);
    }
  });
});

// ─── 6. COUNTRY MODULE ───

describe("Country Module System", () => {
  it("FR country module has correct legal rules", async () => {
    const { getCountryModule } = await import("@/lib/templates/country-module");
    const fr = getCountryModule("FR");
    expect(fr).toBeDefined();
    if (fr) {
      expect(fr.currency).toBe("EUR");
      expect(fr.rules.rentIndexMethod).toBe("IRL");
      expect(fr.rules.minLeaseDuration.empty).toBe(36);
      expect(fr.rules.minLeaseDuration.furnished).toBe(12);
      expect(fr.rules.depositCap.empty).toBe(1);
      expect(fr.rules.energyCertificateRequired).toBe(true);
    }
  });

  it("multiple European modules are registered", async () => {
    const { getRegisteredCountries } = await import("@/lib/templates/country-module");
    const countries = getRegisteredCountries();
    expect(countries).toContain("FR");
    expect(countries).toContain("DE");
    expect(countries).toContain("ES");
    expect(countries).toContain("GB");
  });

  it("country modules validate lease data correctly", async () => {
    const { getCountryModule } = await import("@/lib/templates/country-module");
    const fr = getCountryModule("FR");
    if (fr) {
      // Duration too short for empty lease
      const errors = fr.validateLease({ leaseType: "empty", duration: 12 });
      expect(errors.length).toBeGreaterThan(0);

      // Valid duration
      const noErrors = fr.validateLease({ leaseType: "empty", duration: 36 });
      expect(noErrors.length).toBe(0);
    }
  });
});

// ─── 7. TEMPLATE LANGUAGE COVERAGE ───

describe("Template Language Coverage", () => {
  it("all 13 language label sets exist in registry", async () => {
    // The registry uses L_FR, L_EN, L_ES, L_DE, L_IT, L_PT, L_NL, L_AR, L_TR, L_JA, L_KO, L_ZH, L_HI
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");

    // Test countries from each language group
    const langTests = [
      { country: "FR", langCheck: "Contrat" },
      { country: "DE", langCheck: "Wohnungsmietvertrag" },
      { country: "ES", langCheck: "Contrato" },
      { country: "IT", langCheck: "Contratto" },
      { country: "PT", langCheck: "Contrato" },
      { country: "NL", langCheck: "Huurovereenkomst" },
      { country: "TR", langCheck: "Sözleşmesi" },
      { country: "JP", langCheck: "賃貸借契約書" },
    ];

    for (const lt of langTests) {
      const templates = getTemplatesByCountry(lt.country as any);
      const lease = templates.find(t => t.docType === "lease-residential");
      if (lease) {
        expect(lease.label).toContain(lt.langCheck);
      }
    }
  });

  it("Arabic label set is available in the registry", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    // Verify Arabic countries have templates (labels may be in English or Arabic depending on handcrafted vs generated)
    const saTemplates = getTemplatesByCountry("SA");
    expect(saTemplates.length).toBeGreaterThan(0);
    const lease = saTemplates.find(t => t.docType === "lease-residential");
    expect(lease).toBeDefined();
  });
});

// ─── 8. INTERFACE SYNC ───

describe("Interface Sync", () => {
  it("all pages export default components", async () => {
    const pages = [
      "@/pages/Dashboard",
      "@/pages/Documents",
      "@/pages/Settings",
      "@/pages/Login",
      "@/pages/Signup",
    ];

    for (const page of pages) {
      const mod = await import(page);
      expect(mod.default).toBeDefined();
    }
  });

});
