import type { DocumentTemplate } from "../types";

export const hrLeaseResidential: DocumentTemplate = {
  id: "hr-lease-residential",
  version: "1.0.0",
  country: "HR",
  category: "rental",
  docType: "lease-residential",
  label: "Ugovor o najmu stana (Hrvatska)",
  description: "Ugovor o najmu u skladu sa Zakonom o najmu stanova.",
  legalBasis: "Zakon o najmu stanova (NN 91/96, 48/98, 66/98, 22/06, 68/18)",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Ime najmodavca", type: "text", required: true, validation: { minLength: 2 }, group: "Najmodavac" },
    { key: "landlordAddress", label: "Adresa najmodavca", type: "text", required: true, group: "Najmodavac" },
    { key: "tenantName", label: "Ime najmoprimca", type: "text", required: true, validation: { minLength: 2 }, group: "Najmoprimac" },
    { key: "propertyAddress", label: "Adresa stana", type: "text", required: true, group: "Stan" },
    { key: "surface", label: "Površina (m²)", type: "number", required: true, validation: { min: 1 }, group: "Stan" },
    { key: "rooms", label: "Broj soba", type: "number", required: true, validation: { min: 1 }, group: "Stan" },
    { key: "rentAmount", label: "Mjesečna najamnina (€)", type: "number", required: true, validation: { min: 1 }, group: "Financije" },
    { key: "depositAmount", label: "Polog (€)", type: "number", required: true, validation: { min: 0 }, group: "Financije" },
    { key: "startDate", label: "Datum početka", type: "date", required: true, group: "Trajanje" },
    { key: "duration", label: "Trajanje", type: "select", required: true, options: [
      { value: "indefinite", label: "Neodređeno" },
      { value: "12", label: "12 mjeseci" },
    ], defaultValue: "12", group: "Trajanje" },
  ],
  clauses: [
    { id: "parties", label: "Čl. 1 — Ugovorne strane", required: true,
      text: "UGOVOR O NAJMU STANA\n\nNajmodavac: {landlordName}, {landlordAddress}\nNajmoprimac: {tenantName}" },
    { id: "stan", label: "Čl. 2 — Predmet najma", required: true,
      text: "Stan na adresi {propertyAddress}, {surface} m², {rooms} soba." },
    { id: "najamnina", label: "Čl. 3 — Najamnina", required: true,
      text: "Najamnina iznosi {rentAmount} €/mjesec. Polog: {depositAmount} €." },
    { id: "otkaz", label: "Čl. 4 — Otkaz", required: true,
      text: "Otkazni rok: 30 dana (najmoprimac), 90 dana (najmodavac). Ugovor se ovjerava kod javnog bilježnika." },
  ],
};

export const hrRentReceipt: DocumentTemplate = {
  id: "hr-rent-receipt",
  version: "1.0.0",
  country: "HR",
  category: "rental",
  docType: "rent-receipt",
  label: "Potvrda o plaćenoj najamnini (Hrvatska)",
  description: "Potvrda o plaćenoj najamnini.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Najmodavac", type: "text", required: true, group: "Najmodavac" },
    { key: "tenantName", label: "Najmoprimac", type: "text", required: true, group: "Najmoprimac" },
    { key: "propertyAddress", label: "Adresa", type: "text", required: true, group: "Stan" },
    { key: "rentAmount", label: "Najamnina (€)", type: "number", required: true, group: "Iznosi" },
    { key: "chargesAmount", label: "Režije (€)", type: "number", required: true, defaultValue: 0, group: "Iznosi" },
    { key: "period", label: "Razdoblje", type: "text", required: true, placeholder: "Siječanj 2026", group: "Razdoblje" },
    { key: "paymentDate", label: "Datum plaćanja", type: "date", required: true, group: "Razdoblje" },
  ],
  clauses: [
    { id: "potvrda", label: "Potvrda", required: true,
      text: "POTVRDA O PLAĆENOJ NAJAMNINI\n\n{landlordName} potvrđuje primitak od {tenantName}:\n\n• Najamnina: {rentAmount} €\n• Režije: {chargesAmount} €\n• UKUPNO: {totalAmount} €\n\nza razdoblje {period}, plaćeno {paymentDate}.\n\nPotpis:" },
  ],
};
