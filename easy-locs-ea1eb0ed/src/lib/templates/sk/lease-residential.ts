import type { DocumentTemplate } from "../types";

export const skLeaseResidential: DocumentTemplate = {
  id: "sk-lease-residential",
  version: "1.0.0",
  country: "SK",
  category: "rental",
  docType: "lease-residential",
  label: "Nájomná zmluva (Slovensko)",
  description: "Nájomná zmluva podľa Občianskeho zákonníka §685–716.",
  legalBasis: "Občiansky zákonník č. 40/1964 Zb., §685–716",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Meno prenajímateľa", type: "text", required: true, validation: { minLength: 2 }, group: "Prenajímateľ" },
    { key: "landlordAddress", label: "Adresa prenajímateľa", type: "text", required: true, group: "Prenajímateľ" },
    { key: "tenantName", label: "Meno nájomcu", type: "text", required: true, validation: { minLength: 2 }, group: "Nájomca" },
    { key: "propertyAddress", label: "Adresa bytu", type: "text", required: true, group: "Byt" },
    { key: "surface", label: "Plocha (m²)", type: "number", required: true, validation: { min: 1 }, group: "Byt" },
    { key: "rooms", label: "Počet izieb", type: "number", required: true, validation: { min: 1 }, group: "Byt" },
    { key: "rentAmount", label: "Mesačné nájomné (€)", type: "number", required: true, validation: { min: 1 }, group: "Financie" },
    { key: "depositAmount", label: "Kaucia (€)", type: "number", required: true, validation: { min: 0 }, group: "Financie" },
    { key: "startDate", label: "Dátum začiatku", type: "date", required: true, group: "Doba" },
    { key: "duration", label: "Doba nájmu", type: "select", required: true, options: [
      { value: "indefinite", label: "Na dobu neurčitú" },
      { value: "12", label: "12 mesiacov" },
    ], defaultValue: "12", group: "Doba" },
  ],
  clauses: [
    { id: "parties", label: "§1 — Zmluvné strany", required: true,
      text: "NÁJOMNÁ ZMLUVA\n\nPrenajímateľ: {landlordName}, {landlordAddress}\nNájomca: {tenantName}" },
    { id: "byt", label: "§2 — Predmet nájmu", required: true,
      text: "Byt na adrese {propertyAddress}, {surface} m², {rooms} izieb." },
    { id: "najomne", label: "§3 — Nájomné", required: true,
      text: "Nájomné: {rentAmount} €/mesiac. Kaucia: {depositAmount} €." },
    { id: "vypoved", label: "§4 — Výpoveď", required: true,
      text: "Výpovedná lehota: 3 mesiace. Prenajímateľ môže vypovedať len zo zákonných dôvodov." },
  ],
};

export const skRentReceipt: DocumentTemplate = {
  id: "sk-rent-receipt",
  version: "1.0.0",
  country: "SK",
  category: "rental",
  docType: "rent-receipt",
  label: "Potvrdenie o zaplatení nájomného (Slovensko)",
  description: "Potvrdenie o zaplatení nájomného.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Prenajímateľ", type: "text", required: true, group: "Prenajímateľ" },
    { key: "tenantName", label: "Nájomca", type: "text", required: true, group: "Nájomca" },
    { key: "propertyAddress", label: "Adresa", type: "text", required: true, group: "Byt" },
    { key: "rentAmount", label: "Nájomné (€)", type: "number", required: true, group: "Sumy" },
    { key: "chargesAmount", label: "Služby (€)", type: "number", required: true, defaultValue: 0, group: "Sumy" },
    { key: "period", label: "Obdobie", type: "text", required: true, placeholder: "Január 2026", group: "Obdobie" },
    { key: "paymentDate", label: "Dátum platby", type: "date", required: true, group: "Obdobie" },
  ],
  clauses: [
    { id: "potvrdenie", label: "Potvrdenie", required: true,
      text: "POTVRDENIE O ZAPLATENÍ NÁJOMNÉHO\n\n{landlordName} potvrdzuje prijatie od {tenantName}:\n\n• Nájomné: {rentAmount} €\n• Služby: {chargesAmount} €\n• SPOLU: {totalAmount} €\n\nza obdobie {period}, zaplatené {paymentDate}.\n\nPodpis:" },
  ],
};
