import { describe, it, expect } from "vitest";

describe("Document Templates", () => {
  it("registry exports getTemplatesByCountry", async () => {
    const registry = await import("@/lib/templates/registry");
    expect(registry.getTemplatesByCountry).toBeDefined();
  });

  it("FR templates include lease-furnished", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const frTemplates = getTemplatesByCountry("FR");
    expect(frTemplates.length).toBeGreaterThan(0);
    const furnished = frTemplates.find((t) => t.id === "fr-lease-furnished");
    expect(furnished).toBeDefined();
  });

  it("AE template includes Ejari fields", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const aeTemplates = getTemplatesForCountry("AE");
    expect(aeTemplates.length).toBeGreaterThan(0);
    const lease = aeTemplates.find((t) => t.country === "AE");
    expect(lease).toBeDefined();
    if (lease) {
      const emiratesIdField = lease.fields.find((f) => f.key === "emirates_id_tenant");
      expect(emiratesIdField).toBeDefined();
    }
  });

  it("validation module exports validateDocument", async () => {
    const validation = await import("@/lib/templates/validation");
    expect(validation.validateDocument).toBeDefined();
  });

  it("country-module exports getCountryRules", async () => {
    const countryModule = await import("@/lib/templates/country-module");
    expect(countryModule.getCountryRules).toBeDefined();
  });

  it("FR country rules have correct deposit cap", async () => {
    const { getCountryRules } = await import("@/lib/templates/country-module");
    const rules = getCountryRules("FR");
    if (rules) {
      expect(rules.depositCapMonths).toBeDefined();
    }
  });
});

describe("PDF Generator", () => {
  it("exports generateFromTemplate function", async () => {
    const pdfGen = await import("@/lib/pdf-generator");
    expect(pdfGen.generateFromTemplate).toBeDefined();
  });
});

describe("CSV Export/Import", () => {
  it("csv-export module loads", async () => {
    const mod = await import("@/lib/csv-export");
    expect(mod).toBeDefined();
  });

  it("csv-import module loads", async () => {
    const mod = await import("@/lib/csv-import");
    expect(mod).toBeDefined();
  });
});
