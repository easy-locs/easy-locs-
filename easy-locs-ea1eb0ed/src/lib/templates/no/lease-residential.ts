import type { DocumentTemplate } from "../types";

export const noLeaseResidential: DocumentTemplate = {
  id: "no-lease-residential",
  version: "1.0.0",
  country: "NO",
  category: "rental",
  docType: "lease-residential",
  label: "Husleiekontrakt (Norge)",
  description: "Leiekontrakt i samsvar med Husleieloven.",
  legalBasis: "Husleieloven (Lov om husleieavtaler av 26. mars 1999 nr. 17)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Utleiers navn", type: "text", required: true, validation: { minLength: 2 }, group: "Utleier" },
    { key: "landlordAddress", label: "Utleiers adresse", type: "text", required: true, group: "Utleier" },
    { key: "tenantName", label: "Leietakers navn", type: "text", required: true, validation: { minLength: 2 }, group: "Leietaker" },
    { key: "tenantAddress", label: "Leietakers adresse", type: "text", required: false, group: "Leietaker" },
    { key: "propertyAddress", label: "Leieobjektets adresse", type: "text", required: true, group: "Bolig" },
    { key: "surface", label: "Areal (m²)", type: "number", required: true, validation: { min: 1 }, group: "Bolig" },
    { key: "rooms", label: "Antall rom", type: "number", required: true, validation: { min: 1 }, group: "Bolig" },
    { key: "rentAmount", label: "Månedlig leie (kr)", type: "number", required: true, validation: { min: 1 }, group: "Økonomi" },
    { key: "depositAmount", label: "Depositum (kr)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const d = Number(val); const r = Number(all.rentAmount);
        if (r > 0 && d > r * 6) return "Depositum kan ikke overstige 6 måneders husleie.";
        return null;
      }
    }, group: "Økonomi" },
    { key: "startDate", label: "Innflyttingsdato", type: "date", required: true, group: "Periode" },
    { key: "duration", label: "Varighet", type: "select", required: true, options: [
      { value: "indefinite", label: "Tidsubestemt" },
      { value: "12", label: "12 måneder" },
      { value: "36", label: "3 år" },
    ], defaultValue: "indefinite", group: "Periode" },
  ],
  clauses: [
    { id: "parties", label: "§1 — Parter", required: true,
      text: "HUSLEIEKONTRAKT\n\nUtleier: {landlordName}, {landlordAddress}\nLeietaker: {tenantName}" },
    { id: "bolig", label: "§2 — Leieobjektet", required: true,
      text: "Leieobjektet er beliggende {propertyAddress}, {surface} m², {rooms} rom." },
    { id: "leie", label: "§3 — Husleie", required: true,
      text: "Husleien er {rentAmount} kr/måned. Depositum: {depositAmount} kr, satt inn på egen depositumskonto." },
    { id: "oppsigelse", label: "§4 — Oppsigelse", required: true,
      text: "Oppsigelsestid: 3 måneder for begge parter. Utleiers oppsigelse må være saklig begrunnet etter Husleieloven §9-5." },
  ],
};

export const noRentReceipt: DocumentTemplate = {
  id: "no-rent-receipt",
  version: "1.0.0",
  country: "NO",
  category: "rental",
  docType: "rent-receipt",
  label: "Husleiekvittering (Norge)",
  description: "Kvittering for betalt husleie.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Utleier", type: "text", required: true, group: "Utleier" },
    { key: "tenantName", label: "Leietaker", type: "text", required: true, group: "Leietaker" },
    { key: "propertyAddress", label: "Adresse", type: "text", required: true, group: "Bolig" },
    { key: "rentAmount", label: "Husleie (kr)", type: "number", required: true, group: "Beløp" },
    { key: "chargesAmount", label: "Tillegg (kr)", type: "number", required: true, defaultValue: 0, group: "Beløp" },
    { key: "period", label: "Periode", type: "text", required: true, placeholder: "Januar 2026", group: "Periode" },
    { key: "paymentDate", label: "Betalingsdato", type: "date", required: true, group: "Periode" },
  ],
  clauses: [
    { id: "kvittering", label: "Kvittering", required: true,
      text: "HUSLEIEKVITTERING\n\n{landlordName} bekrefter å ha mottatt fra {tenantName}:\n\n• Husleie: {rentAmount} kr\n• Tillegg: {chargesAmount} kr\n• TOTALT: {totalAmount} kr\n\nfor perioden {period}, betalt {paymentDate}.\n\nUnderskrift:" },
  ],
};
