import type { DocumentTemplate } from "../types";

export const czLeaseResidential: DocumentTemplate = {
  id: "cz-lease-residential",
  version: "1.0.0",
  country: "CZ",
  category: "rental",
  docType: "lease-residential",
  label: "Nájemní smlouva (Česko)",
  description: "Nájemní smlouva dle Občanského zákoníku §2235–2301.",
  legalBasis: "Občanský zákoník č. 89/2012 Sb., §2235–2301",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Jméno pronajímatele", type: "text", required: true, validation: { minLength: 2 }, group: "Pronajímatel" },
    { key: "landlordAddress", label: "Adresa pronajímatele", type: "text", required: true, group: "Pronajímatel" },
    { key: "tenantName", label: "Jméno nájemce", type: "text", required: true, validation: { minLength: 2 }, group: "Nájemce" },
    { key: "tenantAddress", label: "Adresa nájemce", type: "text", required: false, group: "Nájemce" },
    { key: "propertyAddress", label: "Adresa bytu", type: "text", required: true, group: "Byt" },
    { key: "surface", label: "Plocha (m²)", type: "number", required: true, validation: { min: 1 }, group: "Byt" },
    { key: "rooms", label: "Počet pokojů", type: "number", required: true, validation: { min: 1 }, group: "Byt" },
    { key: "rentAmount", label: "Měsíční nájemné (Kč)", type: "number", required: true, validation: { min: 1 }, group: "Finance" },
    { key: "depositAmount", label: "Kauce (Kč)", type: "number", required: true, validation: {
      min: 0,
      custom: (val, all) => {
        const d = Number(val); const r = Number(all.rentAmount);
        if (r > 0 && d > r * 3) return "Kauce nesmí přesáhnout trojnásobek měsíčního nájemného.";
        return null;
      }
    }, group: "Finance" },
    { key: "startDate", label: "Datum zahájení", type: "date", required: true, group: "Doba" },
    { key: "duration", label: "Doba nájmu", type: "select", required: true, options: [
      { value: "indefinite", label: "Na dobu neurčitou" },
      { value: "12", label: "12 měsíců" },
      { value: "24", label: "24 měsíců" },
    ], defaultValue: "indefinite", group: "Doba" },
  ],
  clauses: [
    { id: "parties", label: "§1 — Smluvní strany", required: true,
      text: "NÁJEMNÍ SMLOUVA\n\nPronajímatel: {landlordName}, {landlordAddress}\nNájemce: {tenantName}" },
    { id: "byt", label: "§2 — Předmět nájmu", required: true,
      text: "Byt na adrese {propertyAddress}, {surface} m², {rooms} pokojů." },
    { id: "najemne", label: "§3 — Nájemné", required: true,
      text: "Nájemné činí {rentAmount} Kč/měsíc. Kauce: {depositAmount} Kč." },
    { id: "vypoved", label: "§4 — Výpověď", required: true,
      text: "Výpovědní doba: 3 měsíce. Pronajímatel může vypovědět pouze ze zákonných důvodů dle §2288 OZ." },
  ],
};

export const czRentReceipt: DocumentTemplate = {
  id: "cz-rent-receipt",
  version: "1.0.0",
  country: "CZ",
  category: "rental",
  docType: "rent-receipt",
  label: "Potvrzení o zaplacení nájemného (Česko)",
  description: "Potvrzení o zaplacení nájemného.",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Pronajímatel", type: "text", required: true, group: "Pronajímatel" },
    { key: "tenantName", label: "Nájemce", type: "text", required: true, group: "Nájemce" },
    { key: "propertyAddress", label: "Adresa", type: "text", required: true, group: "Byt" },
    { key: "rentAmount", label: "Nájemné (Kč)", type: "number", required: true, group: "Částky" },
    { key: "chargesAmount", label: "Služby (Kč)", type: "number", required: true, defaultValue: 0, group: "Částky" },
    { key: "period", label: "Období", type: "text", required: true, placeholder: "Leden 2026", group: "Období" },
    { key: "paymentDate", label: "Datum platby", type: "date", required: true, group: "Období" },
  ],
  clauses: [
    { id: "potvrzeni", label: "Potvrzení", required: true,
      text: "POTVRZENÍ O ZAPLACENÍ NÁJEMNÉHO\n\n{landlordName} potvrzuje přijetí od {tenantName}:\n\n• Nájemné: {rentAmount} Kč\n• Služby: {chargesAmount} Kč\n• CELKEM: {totalAmount} Kč\n\nza období {period}, zaplaceno {paymentDate}.\n\nPodpis:" },
  ],
};
