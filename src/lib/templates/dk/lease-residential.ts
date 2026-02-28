import type { DocumentTemplate } from "../types";

export const dkLeaseResidential: DocumentTemplate = {
  id: "dk-lease-residential",
  version: "1.0.0",
  country: "DK",
  category: "rental",
  docType: "lease-residential",
  label: "Lejekontrakt (Danmark)",
  description: "Lejekontrakt i overensstemmelse med Lejeloven.",
  legalBasis: "Lejeloven (Lov nr. 927 af 4. september 2019)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Udlejers navn", type: "text", required: true, validation: { minLength: 2 }, group: "Udlejer" },
    { key: "landlordAddress", label: "Udlejers adresse", type: "text", required: true, group: "Udlejer" },
    { key: "tenantName", label: "Lejers navn", type: "text", required: true, validation: { minLength: 2 }, group: "Lejer" },
    { key: "tenantAddress", label: "Lejers adresse", type: "text", required: false, group: "Lejer" },
    { key: "propertyAddress", label: "Lejemålets adresse", type: "text", required: true, group: "Lejemål" },
    { key: "surface", label: "Areal (m²)", type: "number", required: true, validation: { min: 1 }, group: "Lejemål" },
    { key: "rooms", label: "Antal værelser", type: "number", required: true, validation: { min: 1 }, group: "Lejemål" },
    { key: "rentAmount", label: "Månedlig leje (kr)", type: "number", required: true, validation: { min: 1 }, group: "Økonomi" },
    { key: "depositAmount", label: "Depositum (kr)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const d = Number(val); const r = Number(all.rentAmount);
        if (r > 0 && d > r * 3) return "Depositum må ikke overstige 3 måneders leje.";
        return null;
      }
    }, group: "Økonomi" },
    { key: "prepaidRent", label: "Forudbetalt leje (kr)", type: "number", required: false, validation: {
      custom: (val, all) => {
        const p = Number(val); const r = Number(all.rentAmount);
        if (r > 0 && p > r * 3) return "Forudbetalt leje må ikke overstige 3 måneders leje.";
        return null;
      }
    }, group: "Økonomi" },
    { key: "startDate", label: "Indflytningsdato", type: "date", required: true, group: "Periode" },
  ],
  clauses: [
    { id: "parties", label: "§1 — Parter", required: true,
      text: "LEJEKONTRAKT\n\nUdlejer: {landlordName}, {landlordAddress}\nLejer: {tenantName}" },
    { id: "lejemaal", label: "§2 — Lejemålet", required: true,
      text: "Lejemålet er beliggende {propertyAddress}, {surface} m², {rooms} værelser." },
    { id: "leje", label: "§3 — Leje", required: true,
      text: "Den månedlige leje udgør {rentAmount} kr. Depositum: {depositAmount} kr." },
    { id: "opsigelse", label: "§4 — Opsigelse", required: true,
      text: "Lejer kan opsige med 3 måneders varsel. Udlejer kan kun opsige i henhold til Lejelovens bestemmelser." },
  ],
};

export const dkRentReceipt: DocumentTemplate = {
  id: "dk-rent-receipt",
  version: "1.0.0",
  country: "DK",
  category: "rental",
  docType: "rent-receipt",
  label: "Huslejekvittering (Danmark)",
  description: "Kvittering for betalt husleje.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Udlejer", type: "text", required: true, group: "Udlejer" },
    { key: "tenantName", label: "Lejer", type: "text", required: true, group: "Lejer" },
    { key: "propertyAddress", label: "Adresse", type: "text", required: true, group: "Lejemål" },
    { key: "rentAmount", label: "Leje (kr)", type: "number", required: true, group: "Beløb" },
    { key: "chargesAmount", label: "Forbrug (kr)", type: "number", required: true, defaultValue: 0, group: "Beløb" },
    { key: "period", label: "Periode", type: "text", required: true, placeholder: "Januar 2026", group: "Periode" },
    { key: "paymentDate", label: "Betalingsdato", type: "date", required: true, group: "Periode" },
  ],
  clauses: [
    { id: "kvittering", label: "Kvittering", required: true,
      text: "HUSLEJEKVITTERING\n\n{landlordName} bekræfter at have modtaget fra {tenantName}:\n\n• Leje: {rentAmount} kr\n• Forbrug: {chargesAmount} kr\n• I ALT: {totalAmount} kr\n\nfor perioden {period}, betalt {paymentDate}.\n\nUnderskrift:" },
  ],
};
