import type { DocumentTemplate, Country } from "./types";
import { frRentReceipt } from "./fr/rent-receipt";
import { frLeaseEmpty } from "./fr/lease-empty";
import { frLeaseFurnished } from "./fr/lease-furnished";
import { frLeaseCommercial } from "./fr/lease-commercial";
import { frSwornStatement } from "./fr/sworn-statement";
import { frFormalNotice } from "./fr/formal-notice";
import { frTermination } from "./fr/termination";
import { frCompanySAS, frCompanySARL, frMicroEntrepreneur } from "./fr/company-creation";
import { frChangeDirector, frChangeOffice, frChangeActivity } from "./fr/company-changes";
import { allEuropeTemplates } from "./europe-packs";

const allTemplates: DocumentTemplate[] = [
  // France — fully implemented
  frRentReceipt,
  frLeaseEmpty,
  frLeaseFurnished,
  frLeaseCommercial,
  frSwornStatement,
  frFormalNotice,
  frTermination,
  frCompanySAS,
  frCompanySARL,
  frMicroEntrepreneur,
  frChangeDirector,
  frChangeOffice,
  frChangeActivity,
  // Europe packs — stubs
  ...allEuropeTemplates,
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return allTemplates.find((t) => t.id === id);
}

export function getTemplatesByCountry(country: Country): DocumentTemplate[] {
  return allTemplates.filter((t) => t.country === country);
}

export function getActiveTemplates(country?: Country): DocumentTemplate[] {
  const filtered = country ? allTemplates.filter((t) => t.country === country) : allTemplates;
  return filtered.filter((t) => t.active);
}

export function getAllTemplates(): DocumentTemplate[] {
  return allTemplates;
}

export function getTemplatesByCategory(category: string, country?: Country): DocumentTemplate[] {
  return allTemplates.filter((t) => t.category === category && (!country || t.country === country));
}
