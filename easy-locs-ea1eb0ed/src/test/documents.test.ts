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

  it("AE has Ejari template", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const aeTemplates = getTemplatesByCountry("AE");
    expect(aeTemplates.some((t) => t.docType === "ejari-contract")).toBe(true);
  });

  it("validation module exports validateDocument", async () => {
    const validation = await import("@/lib/templates/validation");
    expect(validation.validateDocument).toBeDefined();
  });

  it("country-module exports getCountryModule", async () => {
    const countryModule = await import("@/lib/templates/country-module");
    expect(countryModule.getCountryModule).toBeDefined();
  });

  it("FR country module has rules", async () => {
    const { getCountryModule } = await import("@/lib/templates/country-module");
    const mod = getCountryModule("FR");
    if (mod) {
      expect(mod.rules).toBeDefined();
    }
  });

  it("ES includes generated fallback doc types", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const esTemplates = getTemplatesByCountry("ES");
    expect(esTemplates.some((t) => t.docType === "formal-notice")).toBe(true);
    expect(esTemplates.some((t) => t.docType === "inventory")).toBe(true);
  });

  it("every registered country has mandatory governmental templates", async () => {
    const { getTemplatesByCountry } = await import("@/lib/templates/registry");
    const { getAllCountryEntries } = await import("@/lib/global-country-registry");

    for (const country of getAllCountryEntries()) {
      const templates = getTemplatesByCountry(country.code);
      expect(templates.some((t) => t.docType === "lease-residential")).toBe(true);
      expect(templates.some((t) => t.docType === "rent-receipt")).toBe(true);
      if (country.legalDocumentTypes.includes("ejari-contract")) {
        expect(templates.some((t) => t.docType === "ejari-contract")).toBe(true);
      }
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
