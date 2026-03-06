import type { DocumentTemplate, Country } from "./types";
import { frRentReceipt } from "./fr/rent-receipt";
import { frLeaseEmpty } from "./fr/lease-empty";
import { frLeaseFurnished } from "./fr/lease-furnished";
import { frLeaseCommercial } from "./fr/lease-commercial";
import { frSwornStatement } from "./fr/sworn-statement";
import { frFormalNotice } from "./fr/formal-notice";
import { frTermination } from "./fr/termination";
import { frCompanySAS, frCompanySARL, frCompanyEURL, frMicroEntrepreneur, frLegalNotice, frFormM0, frFormP0 } from "./fr/company-creation";
import { frChangeDirector, frChangeOffice, frChangeActivity } from "./fr/company-changes";
import { frPVAGO, frAccountsApproval, frShareTransfer, frCapitalIncrease, frDissolution, frPVAGE, frActeCession, frRapportGestion } from "./fr/company-admin";
import { frInventory, frRentRevision, frChargesRegularization, frUnpaidNotice } from "./fr/rental-extras";
import { frCongesBailleur, frCongesLocataire, frCautionSolidaire, frAttestationHebergement, frCommandementPayer, frRestitutionDepot } from "./fr/rental-legal";
import { frStatutsSAS, frStatutsSARL, frPacteAssocies, frNominationCAC } from "./fr/company-legal";
import { allEuropeTemplates } from "./europe-packs";
import { allWorldTemplates } from "./world-packs";
import { allExtraWorldTemplates } from "./world-packs-extra";

const allTemplates: DocumentTemplate[] = [
  // France — Rental
  frRentReceipt,
  frLeaseEmpty,
  frLeaseFurnished,
  frLeaseCommercial,
  frInventory,
  frRentRevision,
  frChargesRegularization,
  frUnpaidNotice,
  // France — Rental legal
  frCongesBailleur,
  frCongesLocataire,
  frCautionSolidaire,
  frAttestationHebergement,
  frCommandementPayer,
  frRestitutionDepot,
  // France — Administrative
  frSwornStatement,
  frFormalNotice,
  frTermination,
  // France — Company creation
  frCompanySAS,
  frCompanySARL,
  frCompanyEURL,
  frMicroEntrepreneur,
  // France — Company formation docs
  frLegalNotice,
  frFormM0,
  frFormP0,
  // France — Company changes
  frChangeDirector,
  frChangeOffice,
  frChangeActivity,
  // France — Company admin
  frPVAGO,
  frAccountsApproval,
  frShareTransfer,
  frCapitalIncrease,
  frDissolution,
  frPVAGE,
  frActeCession,
  frRapportGestion,
  // France — Company legal
  frStatutsSAS,
  frStatutsSARL,
  frPacteAssocies,
  frNominationCAC,
  // Europe packs
  ...allEuropeTemplates,
  // World packs (Americas, Africa, Middle East, Asia-Pacific)
  ...allWorldTemplates,
  // Extra world packs (Indonesia, NZ, Egypt, Pakistan, Bangladesh, China, Ukraine, Jordan, Kuwait)
  ...allExtraWorldTemplates,
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
