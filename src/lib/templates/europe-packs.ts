import type { DocumentTemplate } from "./types";

// European country pack stubs — marked as needing legal review

function makeStub(country: "BE" | "ES" | "IT" | "DE", docType: string, label: string, description: string, legalBasis: string): DocumentTemplate {
  return {
    id: `${country.toLowerCase()}-${docType}`,
    version: "0.1.0",
    country,
    category: "rental",
    docType,
    label,
    description,
    legalBasis,
    needsLegalReview: true,
    active: false,
    fields: [
      { key: "landlordName", label: "Landlord / Propriétaire", type: "text", required: true },
      { key: "tenantName", label: "Tenant / Locataire", type: "text", required: true },
      { key: "propertyAddress", label: "Property Address", type: "text", required: true },
      { key: "rentAmount", label: "Monthly Rent (€)", type: "number", required: true, validation: { min: 1 } },
      { key: "startDate", label: "Start Date", type: "date", required: true },
    ],
    clauses: [
      { id: "legal-review", label: "⚠️ Legal Review Required", required: true, text: "This template requires legal review before use. Content must be validated by a legal professional in the relevant jurisdiction." },
    ],
  };
}

// Belgium
export const beTemplates: DocumentTemplate[] = [
  makeStub("BE", "rent-receipt", "Quittance de loyer (BE)", "Quittance conforme au droit belge.", "Code civil belge, Livre III"),
  makeStub("BE", "lease-residential", "Bail de résidence principale (BE)", "Bail conforme à la législation régionale belge.", "Décret wallon / Ordonnance bruxelloise / Décret flamand"),
];

// Spain
export const esTemplates: DocumentTemplate[] = [
  makeStub("ES", "rent-receipt", "Recibo de alquiler (ES)", "Recibo de alquiler conforme a la LAU.", "Ley de Arrendamientos Urbanos (LAU)"),
  makeStub("ES", "lease-residential", "Contrato de arrendamiento (ES)", "Contrato de vivienda conforme a la LAU.", "Ley 29/1994, de 24 de noviembre"),
];

// Italy
export const itTemplates: DocumentTemplate[] = [
  makeStub("IT", "rent-receipt", "Ricevuta di affitto (IT)", "Ricevuta conforme alla legge italiana.", "Codice Civile italiano, Libro IV"),
  makeStub("IT", "lease-residential", "Contratto di locazione (IT)", "Contratto ad uso abitativo conforme.", "Legge n. 431/1998"),
];

// Germany
export const deTemplates: DocumentTemplate[] = [
  makeStub("DE", "rent-receipt", "Mietquittung (DE)", "Mietquittung nach deutschem Recht.", "BGB §§ 535 ff."),
  makeStub("DE", "lease-residential", "Mietvertrag (DE)", "Wohnungsmietvertrag nach BGB.", "Bürgerliches Gesetzbuch §§ 535-580a"),
];

export const allEuropeTemplates: DocumentTemplate[] = [
  ...beTemplates,
  ...esTemplates,
  ...itTemplates,
  ...deTemplates,
];
