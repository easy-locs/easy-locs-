import type { DocumentTemplate } from "../types";

export const fiLeaseResidential: DocumentTemplate = {
  id: "fi-lease-residential",
  version: "1.0.0",
  country: "FI",
  category: "rental",
  docType: "lease-residential",
  label: "Asuinhuoneiston vuokrasopimus (Suomi)",
  description: "Vuokrasopimus lain asuinhuoneiston vuokrauksesta (481/1995) mukaisesti.",
  legalBasis: "Laki asuinhuoneiston vuokrauksesta 481/1995",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Vuokranantajan nimi", type: "text", required: true, validation: { minLength: 2 }, group: "Vuokranantaja" },
    { key: "landlordAddress", label: "Vuokranantajan osoite", type: "text", required: true, group: "Vuokranantaja" },
    { key: "tenantName", label: "Vuokralaisen nimi", type: "text", required: true, validation: { minLength: 2 }, group: "Vuokralainen" },
    { key: "tenantAddress", label: "Vuokralaisen osoite", type: "text", required: false, group: "Vuokralainen" },
    { key: "propertyAddress", label: "Huoneiston osoite", type: "text", required: true, group: "Huoneisto" },
    { key: "surface", label: "Pinta-ala (m²)", type: "number", required: true, validation: { min: 1 }, group: "Huoneisto" },
    { key: "rooms", label: "Huoneiden lukumäärä", type: "number", required: true, validation: { min: 1 }, group: "Huoneisto" },
    { key: "rentAmount", label: "Vuokra (€/kk)", type: "number", required: true, validation: { min: 1 }, group: "Talous" },
    { key: "depositAmount", label: "Vakuus (€)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const d = Number(val); const r = Number(all.rentAmount);
        if (r > 0 && d > r * 3) return "Vakuus ei saa ylittää 3 kuukauden vuokraa.";
        return null;
      }
    }, group: "Talous" },
    { key: "startDate", label: "Alkamispäivä", type: "date", required: true, group: "Kausi" },
    { key: "duration", label: "Sopimuksen kesto", type: "select", required: true, options: [
      { value: "indefinite", label: "Toistaiseksi voimassa" },
      { value: "12", label: "12 kuukautta" },
    ], defaultValue: "indefinite", group: "Kausi" },
  ],
  clauses: [
    { id: "parties", label: "§1 — Osapuolet", required: true,
      text: "ASUINHUONEISTON VUOKRASOPIMUS\n\nVuokranantaja: {landlordName}, {landlordAddress}\nVuokralainen: {tenantName}" },
    { id: "huoneisto", label: "§2 — Vuokrakohde", required: true,
      text: "Huoneisto osoitteessa {propertyAddress}, {surface} m², {rooms} huonetta." },
    { id: "vuokra", label: "§3 — Vuokra", required: true,
      text: "Vuokra on {rentAmount} €/kk. Vakuus: {depositAmount} €." },
    { id: "irtisanominen", label: "§4 — Irtisanominen", required: true,
      text: "Vuokralaisen irtisanomisaika: 1 kuukausi. Vuokranantajan irtisanomisaika: 3 kuukautta (6 kk jos vuokrasuhde kestänyt yli vuoden)." },
  ],
};

export const fiRentReceipt: DocumentTemplate = {
  id: "fi-rent-receipt",
  version: "1.0.0",
  country: "FI",
  category: "rental",
  docType: "rent-receipt",
  label: "Vuokrakuitti (Suomi)",
  description: "Kuitti maksetusta vuokrasta.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Vuokranantaja", type: "text", required: true, group: "Vuokranantaja" },
    { key: "tenantName", label: "Vuokralainen", type: "text", required: true, group: "Vuokralainen" },
    { key: "propertyAddress", label: "Osoite", type: "text", required: true, group: "Huoneisto" },
    { key: "rentAmount", label: "Vuokra (€)", type: "number", required: true, group: "Summa" },
    { key: "chargesAmount", label: "Lisäkulut (€)", type: "number", required: true, defaultValue: 0, group: "Summa" },
    { key: "period", label: "Kausi", type: "text", required: true, placeholder: "Tammikuu 2026", group: "Kausi" },
    { key: "paymentDate", label: "Maksupäivä", type: "date", required: true, group: "Kausi" },
  ],
  clauses: [
    { id: "kuitti", label: "Kuitti", required: true,
      text: "VUOKRAKUITTI\n\n{landlordName} vahvistaa vastaanottaneensa {tenantName}:\n\n• Vuokra: {rentAmount} €\n• Lisäkulut: {chargesAmount} €\n• YHTEENSÄ: {totalAmount} €\n\nkaudelta {period}, maksettu {paymentDate}.\n\nAllekirjoitus:" },
  ],
};
