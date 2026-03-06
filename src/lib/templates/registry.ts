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
import { allExtraWorldTemplates2 } from "./world-packs-extra2";
import { getAllCountryEntries } from "@/lib/global-country-registry";

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
  // Extra world packs 2 (Bahrain, Oman, Ethiopia, Tanzania, Uganda, Rwanda, Mauritius, Lebanon, Iraq, Nepal, Sri Lanka, Cambodia, Taiwan, HK, DR, Costa Rica, Panama)
  ...allExtraWorldTemplates2,
];

const existingCountries = new Set(allTemplates.map((t) => String(t.country)));

const generatedFallbackTemplates: DocumentTemplate[] = getAllCountryEntries()
  .filter((country) => !existingCountries.has(country.code))
  .flatMap((country) => {
    const cc = country.code.toLowerCase();
    return [
      {
        id: `${cc}-lease-residential`,
        version: "1.0.0",
        country: country.code as any,
        category: "rental",
        docType: "lease-residential",
        label: `Residential Lease Agreement (${country.name})`,
        description: `Localized lease template for ${country.name}.`,
        legalBasis: country.legalDocumentTypes.includes("lease-residential")
          ? `Based on ${country.name} residential tenancy requirements`
          : `Standard legal rental agreement for ${country.name}`,
        needsLegalReview: true,
        active: true,
        fields: [
          { key: "landlordName", label: "Landlord", type: "text", required: true, group: "Parties" },
          { key: "landlordAddress", label: "Landlord address", type: "text", required: true, group: "Parties" },
          { key: "tenantName", label: "Tenant", type: "text", required: true, group: "Parties" },
          { key: "tenantAddress", label: "Tenant address", type: "text", required: false, group: "Parties" },
          { key: "propertyAddress", label: "Property address", type: "text", required: true, group: "Property" },
          { key: "surface", label: `Surface (${country.measurementUnit === "imperial" ? "sq ft" : "m²"})`, type: "number", required: true, group: "Property" },
          { key: "rooms", label: "Rooms", type: "number", required: true, group: "Property" },
          { key: "rentAmount", label: `Rent (${country.currencySymbol})`, type: "number", required: true, group: "Financial" },
          { key: "chargesAmount", label: `Charges (${country.currencySymbol})`, type: "number", required: false, defaultValue: 0, group: "Financial" },
          { key: "depositAmount", label: `Deposit (${country.currencySymbol})`, type: "number", required: false, defaultValue: 0, group: "Financial" },
          { key: "startDate", label: "Start date", type: "date", required: true, group: "Duration" },
          { key: "duration", label: "Duration", type: "select", required: true, group: "Duration", options: [
            { value: "12", label: "12 months" },
            { value: "indefinite", label: "Open-ended" },
          ], defaultValue: "12" },
        ],
        clauses: [
          { id: "parties", label: "§1 — Parties", required: true, text: "Between {landlordName}, located at {landlordAddress}, and {tenantName}." },
          { id: "property", label: "§2 — Property", required: true, text: "The rented property is located at {propertyAddress}, with a surface of {surface} and {rooms} room(s)." },
          { id: "rent", label: "§3 — Rent", required: true, text: "Monthly rent is {rentAmount}. Additional charges are {chargesAmount}. Deposit is {depositAmount}." },
          { id: "term", label: "§4 — Duration", required: true, text: "The lease starts on {startDate} for {duration}." },
        ],
      },
      {
        id: `${cc}-rent-receipt`,
        version: "1.0.0",
        country: country.code as any,
        category: "rental",
        docType: "rent-receipt",
        label: `Rent Receipt (${country.name})`,
        description: `Localized rent receipt template for ${country.name}.`,
        needsLegalReview: false,
        active: true,
        fields: [
          { key: "landlordName", label: "Landlord", type: "text", required: true, group: "Parties" },
          { key: "tenantName", label: "Tenant", type: "text", required: true, group: "Parties" },
          { key: "propertyAddress", label: "Property", type: "text", required: true, group: "Property" },
          { key: "rentAmount", label: `Rent (${country.currencySymbol})`, type: "number", required: true, group: "Payment" },
          { key: "chargesAmount", label: `Charges (${country.currencySymbol})`, type: "number", required: false, defaultValue: 0, group: "Payment" },
          { key: "period", label: "Period", type: "text", required: true, group: "Payment" },
          { key: "paymentDate", label: "Payment date", type: "date", required: true, group: "Payment" },
        ],
        clauses: [
          {
            id: "receipt",
            label: "Receipt",
            required: true,
            text: "{landlordName} acknowledges receipt of rent from {tenantName} for {period}. Rent: {rentAmount}. Charges: {chargesAmount}. Total: {total}.",
          },
        ],
      },
    ];
  });

allTemplates.push(...generatedFallbackTemplates);

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
