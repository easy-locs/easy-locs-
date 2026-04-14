import type { DocumentTemplate } from "./types";

// ─── Helper to build a comprehensive residential lease template ───
interface LeaseLocale {
  label: string; desc: string; legal?: string;
  landlord: string; landlordAddr: string; tenant: string; tenantAddr: string;
  address: string; surface: string; rooms: string; rent: string; deposit: string;
  start: string; duration: string; indefinite: string; months12: string;
  parties: string; property: string; rentClause: string; termination: string;
  terminationText: string;
  partiesText: (v: string) => string;
  propertyText: (v: string) => string;
  rentText: (v: string) => string;
  surfaceUnit?: string; currency: string;
  // Optional extended clauses — auto-generated if omitted
  depositClause?: string;
  obligationsTenant?: string;
  obligationsLandlord?: string;
  maintenanceClause?: string;
  governingLaw?: string;
}

function makeLease(country: string, lang: LeaseLocale): DocumentTemplate {
  const ll = lang.landlord.toLowerCase();
  const tl = lang.tenant.toLowerCase();

  const depositText = lang.depositClause ||
    `The ${tl} shall pay a security deposit as specified. The deposit shall be returned at the end of the tenancy, less any amounts for unpaid rent, damages beyond normal wear and tear, or other obligations under this agreement. The ${ll} must return the deposit within the timeframe prescribed by applicable law.`;

  const tenantObligations = lang.obligationsTenant ||
    `The ${tl} agrees to:\n\n• Pay rent punctually on the agreed date\n• Use the property exclusively for residential purposes\n• Maintain the property in good condition\n• Not sublet or assign without written consent\n• Allow reasonable access for inspections with prior notice\n• Not cause nuisance or disturbance to neighbours\n• Report any damage or needed repairs promptly\n• Comply with all applicable laws and building regulations\n• Return the property in its original condition, accounting for normal wear and tear`;

  const landlordObligations = lang.obligationsLandlord ||
    `The ${ll} agrees to:\n\n• Deliver the property in habitable condition\n• Maintain the structural integrity and essential systems\n• Carry out major repairs not caused by the ${tl}\n• Respect the ${tl}'s right to quiet enjoyment\n• Provide required documentation and certificates\n• Give proper notice before entering the property\n• Comply with all applicable housing and safety regulations`;

  const maintenanceText = lang.maintenanceClause ||
    `The ${tl} is responsible for minor day-to-day maintenance and upkeep.\n\nThe ${ll} is responsible for structural repairs, essential installations, and any repairs not attributable to the ${tl}'s use.\n\nThe ${tl} shall not make alterations without the ${ll}'s prior written consent.`;

  const lawText = lang.governingLaw ||
    `This agreement is governed by the laws of ${country}${lang.legal ? ` (${lang.legal})` : ''}.\n\nAny dispute shall be submitted to the competent courts of the jurisdiction where the property is located.\n\nIf any provision is found to be invalid, the remaining provisions shall continue in full force and effect.`;

  return {
    id: `${country.toLowerCase()}-lease-residential`,
    version: "1.0.0",
    country: country,
    category: "rental",
    docType: "lease-residential",
    label: lang.label,
    description: lang.desc,
    legalBasis: lang.legal,
    needsLegalReview: true,
    active: true,
    fields: [
      { key: "landlordName", label: lang.landlord, type: "text", required: true, validation: { minLength: 2 }, group: lang.landlord },
      { key: "landlordAddress", label: lang.landlordAddr, type: "text", required: true, group: lang.landlord },
      { key: "landlordEmail", label: `${lang.landlord} email`, type: "email", required: false, group: lang.landlord },
      { key: "tenantName", label: lang.tenant, type: "text", required: true, validation: { minLength: 2 }, group: lang.tenant },
      { key: "tenantAddress", label: lang.tenantAddr, type: "text", required: false, group: lang.tenant },
      { key: "tenantEmail", label: `${lang.tenant} email`, type: "email", required: false, group: lang.tenant },
      { key: "propertyAddress", label: lang.address, type: "text", required: true, group: lang.property },
      { key: "surface", label: `${lang.surface} (${lang.surfaceUnit || "m²"})`, type: "number", required: true, validation: { min: 1 }, group: lang.property },
      { key: "rooms", label: lang.rooms, type: "number", required: true, validation: { min: 1 }, group: lang.property },
      { key: "furnished", label: "Furnished", type: "select", required: true, options: [
        { value: "unfurnished", label: "Unfurnished" },
        { value: "furnished", label: "Furnished" },
      ], defaultValue: "unfurnished", group: lang.property },
      { key: "rentAmount", label: `${lang.rent} (${lang.currency})`, type: "number", required: true, validation: { min: 1 }, group: lang.rentClause },
      { key: "chargesAmount", label: `Service charges (${lang.currency})`, type: "number", required: false, defaultValue: 0, group: lang.rentClause },
      { key: "depositAmount", label: `${lang.deposit} (${lang.currency})`, type: "number", required: true, validation: { min: 0 }, group: lang.rentClause },
      { key: "paymentDay", label: "Payment day", type: "number", required: true, validation: { min: 1, max: 28 }, defaultValue: 1, group: lang.rentClause },
      { key: "startDate", label: lang.start, type: "date", required: true, group: lang.duration },
      { key: "duration", label: lang.duration, type: "select", required: true, options: [
        { value: "indefinite", label: lang.indefinite },
        { value: "6", label: "6 months" },
        { value: "12", label: lang.months12 },
        { value: "24", label: "24 months" },
      ], defaultValue: "12", group: lang.duration },
    ],
    clauses: [
      { id: "parties", label: `§1 — ${lang.parties}`, required: true, text: lang.partiesText("{landlordName}, {landlordAddress}\n{tenantName}") },
      { id: "property", label: `§2 — ${lang.property}`, required: true, text: lang.propertyText("{propertyAddress}, {surface}, {rooms}, {furnished}") },
      { id: "rent", label: `§3 — ${lang.rentClause}`, required: true, text: lang.rentText("{rentAmount}, {chargesAmount}, {paymentDay}") },
      { id: "deposit", label: `§4 — ${lang.deposit}`, required: true, text: depositText },
      { id: "obligations-tenant", label: `§5 — ${lang.tenant} Obligations`, required: true, text: tenantObligations },
      { id: "obligations-landlord", label: `§6 — ${lang.landlord} Obligations`, required: true, text: landlordObligations },
      { id: "maintenance", label: `§7 — Maintenance`, required: true, text: maintenanceText },
      { id: "termination", label: `§8 — ${lang.termination}`, required: true, text: lang.terminationText },
      { id: "governing-law", label: `§9 — Governing Law`, required: true, text: lawText },
    ],
  };
}

function makeReceipt(
  country: string,
  lang: { label: string; desc: string; landlord: string; tenant: string; address: string; rent: string; charges: string; period: string; periodPlaceholder: string; paymentDate: string; receiptText: string; currency: string }
): DocumentTemplate {
  return {
    id: `${country.toLowerCase()}-rent-receipt`,
    version: "1.0.0",
    country: country,
    category: "rental",
    docType: "rent-receipt",
    label: lang.label,
    description: lang.desc,
    needsLegalReview: false,
    active: true,
    fields: [
      { key: "landlordName", label: lang.landlord, type: "text", required: true, group: lang.landlord },
      { key: "tenantName", label: lang.tenant, type: "text", required: true, group: lang.tenant },
      { key: "propertyAddress", label: lang.address, type: "text", required: true, group: lang.address },
      { key: "rentAmount", label: `${lang.rent} (${lang.currency})`, type: "number", required: true, group: lang.rent },
      { key: "chargesAmount", label: `${lang.charges} (${lang.currency})`, type: "number", required: true, defaultValue: 0, group: lang.rent },
      { key: "period", label: lang.period, type: "text", required: true, placeholder: lang.periodPlaceholder, group: lang.period },
      { key: "paymentDate", label: lang.paymentDate, type: "date", required: true, group: lang.period },
    ],
    clauses: [
      { id: "receipt", label: lang.label, required: true, text: lang.receiptText },
    ],
  };
}

// ─── USA ───
export const usLeaseResidential = makeLease("US", {
  label: "Residential Lease Agreement (USA)",
  desc: "Standard residential lease agreement under US state law.",
  legal: "State-specific landlord-tenant law",
  landlord: "Landlord", landlordAddr: "Landlord address", tenant: "Tenant", tenantAddr: "Tenant address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Either party may terminate with 30 days' written notice for month-to-month tenancies.",
  partiesText: (v) => `RESIDENTIAL LEASE AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property located at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}. Security deposit as specified.`,
  surfaceUnit: "sq ft", currency: "$",
});
export const usRentReceipt = makeReceipt("US", {
  label: "Rent Receipt (USA)", desc: "Receipt for rent payment.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "$",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: ${rentAmount}\n• Fees: ${chargesAmount}\n• TOTAL: ${totalAmount}\n\nFor period {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Canada ───
export const caLeaseResidential = makeLease("CA", {
  label: "Residential Tenancy Agreement (Canada)",
  desc: "Standard residential tenancy agreement.",
  legal: "Provincial Residential Tenancies Act",
  landlord: "Landlord", landlordAddr: "Landlord address", tenant: "Tenant", tenantAddr: "Tenant address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Termination notice periods vary by province. Consult local legislation.",
  partiesText: (v) => `RESIDENTIAL TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property located at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`,
  surfaceUnit: "sq ft", currency: "CA$",
});
export const caRentReceipt = makeReceipt("CA", {
  label: "Rent Receipt (Canada)", desc: "Receipt for rent payment.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "CA$",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: {rentAmount} CA$\n• Fees: {chargesAmount} CA$\n• TOTAL: {totalAmount} CA$\n\nFor period {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Brazil ───
export const brLeaseResidential = makeLease("BR", {
  label: "Contrato de Locação Residencial (Brasil)",
  desc: "Contrato de locação conforme Lei do Inquilinato (8.245/91).",
  legal: "Lei 8.245/91 (Lei do Inquilinato)",
  landlord: "Locador", landlordAddr: "Endereço do locador", tenant: "Locatário", tenantAddr: "Endereço do locatário",
  address: "Endereço do imóvel", surface: "Área", rooms: "Cômodos", rent: "Aluguel mensal", deposit: "Caução",
  start: "Data de início", duration: "Duração", indefinite: "Prazo indeterminado", months12: "12 meses",
  parties: "Partes", property: "Imóvel", rentClause: "Aluguel", termination: "Rescisão",
  terminationText: "O locatário pode rescindir com 30 dias de aviso prévio. Multa proporcional aplicável.",
  partiesText: (v) => `CONTRATO DE LOCAÇÃO RESIDENCIAL\n\nLocador: ${v}`,
  propertyText: (v) => `Imóvel situado em ${v}.`,
  rentText: (v) => `Aluguel mensal: ${v}.`,
  currency: "R$",
});
export const brRentReceipt = makeReceipt("BR", {
  label: "Recibo de Aluguel (Brasil)", desc: "Recibo de pagamento de aluguel.",
  landlord: "Locador", tenant: "Locatário", address: "Imóvel", rent: "Aluguel", charges: "Encargos",
  period: "Período", periodPlaceholder: "Janeiro 2026", paymentDate: "Data de pagamento", currency: "R$",
  receiptText: "RECIBO DE ALUGUEL\n\n{landlordName} confirma o recebimento de {tenantName}:\n\n• Aluguel: R$ {rentAmount}\n• Encargos: R$ {chargesAmount}\n• TOTAL: R$ {totalAmount}\n\nPeríodo: {period}, pago em {paymentDate}.\n\nAssinatura:",
});

// ─── Mexico ───
export const mxLeaseResidential = makeLease("MX", {
  label: "Contrato de Arrendamiento (México)",
  desc: "Contrato de arrendamiento conforme al Código Civil Federal.",
  legal: "Código Civil Federal",
  landlord: "Arrendador", landlordAddr: "Domicilio del arrendador", tenant: "Arrendatario", tenantAddr: "Domicilio del arrendatario",
  address: "Ubicación del inmueble", surface: "Superficie", rooms: "Habitaciones", rent: "Renta mensual", deposit: "Depósito",
  start: "Fecha de inicio", duration: "Duración", indefinite: "Tiempo indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Renta", termination: "Terminación",
  terminationText: "El contrato puede rescindirse con preaviso de 30 días conforme a la legislación aplicable.",
  partiesText: (v) => `CONTRATO DE ARRENDAMIENTO\n\nArrendador: ${v}`,
  propertyText: (v) => `Inmueble ubicado en ${v}.`,
  rentText: (v) => `Renta mensual: ${v}.`,
  currency: "MX$",
});
export const mxRentReceipt = makeReceipt("MX", {
  label: "Recibo de Renta (México)", desc: "Recibo de pago de renta.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Renta", charges: "Gastos",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "MX$",
  receiptText: "RECIBO DE RENTA\n\n{landlordName} confirma la recepción de {tenantName}:\n\n• Renta: MX$ {rentAmount}\n• Gastos: MX$ {chargesAmount}\n• TOTAL: MX$ {totalAmount}\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Morocco ───
export const maLeaseResidential = makeLease("MA", {
  label: "Contrat de bail résidentiel (Maroc)",
  desc: "Contrat de bail conforme au Dahir des obligations et contrats.",
  legal: "Dahir des obligations et contrats (DOC)",
  landlord: "Bailleur", landlordAddr: "Adresse du bailleur", tenant: "Locataire", tenantAddr: "Adresse du locataire",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer mensuel", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Durée indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis de 3 mois pour la résiliation conformément au DOC.",
  partiesText: (v) => `CONTRAT DE BAIL RÉSIDENTIEL\n\nBailleur: ${v}`,
  propertyText: (v) => `Bien situé à ${v}.`,
  rentText: (v) => `Loyer mensuel: ${v}.`,
  currency: "DH",
});
export const maRentReceipt = makeReceipt("MA", {
  label: "Quittance de loyer (Maroc)", desc: "Quittance de paiement de loyer.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "DH",
  receiptText: "QUITTANCE DE LOYER\n\n{landlordName} confirme la réception de {tenantName} :\n\n• Loyer : {rentAmount} DH\n• Charges : {chargesAmount} DH\n• TOTAL : {totalAmount} DH\n\nPour la période {period}, payé le {paymentDate}.\n\nSignature :",
});

// ─── Tunisia ───
export const tnLeaseResidential = makeLease("TN", {
  label: "Contrat de bail résidentiel (Tunisie)",
  desc: "Contrat de bail conforme au Code des obligations.",
  legal: "Code des obligations et contrats",
  landlord: "Bailleur", landlordAddr: "Adresse du bailleur", tenant: "Locataire", tenantAddr: "Adresse du locataire",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer mensuel", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Durée indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis de 3 mois. Le locataire peut résilier à tout moment avec préavis.",
  partiesText: (v) => `CONTRAT DE BAIL\n\nBailleur: ${v}`,
  propertyText: (v) => `Bien situé à ${v}.`,
  rentText: (v) => `Loyer mensuel: ${v}.`,
  currency: "DT",
});
export const tnRentReceipt = makeReceipt("TN", {
  label: "Quittance de loyer (Tunisie)", desc: "Quittance de paiement.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "DT",
  receiptText: "QUITTANCE DE LOYER\n\n{landlordName} confirme la réception de {tenantName} :\n\n• Loyer : {rentAmount} DT\n• Charges : {chargesAmount} DT\n• TOTAL : {totalAmount} DT\n\nPériode {period}, payé le {paymentDate}.\n\nSignature :",
});

// ─── Senegal ───
export const snLeaseResidential = makeLease("SN", {
  label: "Contrat de bail (Sénégal)", desc: "Contrat conforme au droit OHADA.",
  legal: "Code civil OHADA", landlord: "Bailleur", landlordAddr: "Adresse", tenant: "Locataire", tenantAddr: "Adresse",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis de 3 mois conformément au droit OHADA.",
  partiesText: (v) => `CONTRAT DE BAIL\n\nBailleur: ${v}`,
  propertyText: (v) => `Bien situé à ${v}.`,
  rentText: (v) => `Loyer mensuel: ${v}.`, currency: "FCFA",
});
export const snRentReceipt = makeReceipt("SN", {
  label: "Quittance (Sénégal)", desc: "Quittance de loyer.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "FCFA",
  receiptText: "QUITTANCE\n\n{landlordName} confirme la réception de {tenantName} :\n\n• Loyer : {rentAmount} FCFA\n• Charges : {chargesAmount} FCFA\n• TOTAL : {totalAmount} FCFA\n\nPériode {period}, payé le {paymentDate}.\n\nSignature :",
});

// ─── Ivory Coast ───
export const ciLeaseResidential = makeLease("CI", {
  label: "Contrat de bail (Côte d'Ivoire)", desc: "Contrat conforme au droit OHADA.",
  legal: "Code civil OHADA", landlord: "Bailleur", landlordAddr: "Adresse", tenant: "Locataire", tenantAddr: "Adresse",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis de 3 mois conformément au droit OHADA.",
  partiesText: (v) => `CONTRAT DE BAIL\n\nBailleur: ${v}`,
  propertyText: (v) => `Bien situé à ${v}.`,
  rentText: (v) => `Loyer mensuel: ${v}.`, currency: "FCFA",
});
export const ciRentReceipt = makeReceipt("CI", {
  label: "Quittance (Côte d'Ivoire)", desc: "Quittance de loyer.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "FCFA",
  receiptText: "QUITTANCE\n\n{landlordName} confirme la réception de {tenantName} :\n\n• Loyer : {rentAmount} FCFA\n• Charges : {chargesAmount} FCFA\n• TOTAL : {totalAmount} FCFA\n\nPériode {period}, payé le {paymentDate}.\n\nSignature :",
});

// ─── South Africa ───
export const zaLeaseResidential = makeLease("ZA", {
  label: "Residential Lease Agreement (South Africa)",
  desc: "Standard lease under the Rental Housing Act.",
  legal: "Rental Housing Act 50 of 1999",
  landlord: "Landlord", landlordAddr: "Landlord address", tenant: "Tenant", tenantAddr: "Tenant address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Either party may terminate with one calendar month's written notice.",
  partiesText: (v) => `RESIDENTIAL LEASE AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "R",
});
export const zaRentReceipt = makeReceipt("ZA", {
  label: "Rent Receipt (South Africa)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Levies",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "R",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: R {rentAmount}\n• Levies: R {chargesAmount}\n• TOTAL: R {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── UAE (Ejari-compliant) ───
export const aeLeaseResidential: DocumentTemplate = {
  id: "ae-lease-residential",
  version: "2.0.0",
  country: "AE",
  category: "rental",
  docType: "lease-residential",
  label: "Tenancy Contract (UAE – Ejari)",
  description: "Official tenancy contract compliant with RERA regulations and Ejari registration.",
  legalBasis: "RERA / Dubai Law No. 26 of 2007 / Ejari System",
  needsLegalReview: false,
  active: true,
  fields: [
    { key: "landlordName", label: "Landlord full name", type: "text", required: true, validation: { minLength: 2 }, group: "Landlord" },
    { key: "landlordNationality", label: "Landlord nationality", type: "text", required: true, group: "Landlord" },
    { key: "landlordEmiratesId", label: "Emirates ID / Passport No.", type: "text", required: true, group: "Landlord" },
    { key: "landlordAddress", label: "Landlord address", type: "text", required: true, group: "Landlord" },
    { key: "landlordPhone", label: "Phone", type: "phone", required: false, group: "Landlord" },
    { key: "landlordEmail", label: "Email", type: "email", required: false, group: "Landlord" },
    { key: "tenantName", label: "Tenant full name", type: "text", required: true, validation: { minLength: 2 }, group: "Tenant" },
    { key: "tenantNationality", label: "Tenant nationality", type: "text", required: true, group: "Tenant" },
    { key: "tenantEmiratesId", label: "Emirates ID / Passport No.", type: "text", required: true, group: "Tenant" },
    { key: "tenantAddress", label: "Tenant current address", type: "text", required: false, group: "Tenant" },
    { key: "tenantPhone", label: "Phone", type: "phone", required: false, group: "Tenant" },
    { key: "tenantEmail", label: "Email", type: "email", required: false, group: "Tenant" },
    { key: "propertyAddress", label: "Property address", type: "text", required: true, validation: { minLength: 5 }, group: "Property" },
    { key: "propertyType", label: "Property type", type: "select", required: true, options: [
      { value: "Apartment", label: "Apartment" }, { value: "Villa", label: "Villa" },
      { value: "Studio", label: "Studio" }, { value: "Townhouse", label: "Townhouse" },
      { value: "Office", label: "Office" },
    ], group: "Property" },
    { key: "makaniNumber", label: "Makani number", type: "text", required: false, group: "Property" },
    { key: "dewaNumber", label: "DEWA premises number", type: "text", required: false, group: "Property" },
    { key: "surface", label: "Area (sq ft)", type: "number", required: true, validation: { min: 1 }, group: "Property" },
    { key: "rooms", label: "Bedrooms", type: "number", required: true, validation: { min: 0 }, group: "Property" },
    { key: "furnished", label: "Furnished", type: "select", required: true, options: [
      { value: "Furnished", label: "Furnished" }, { value: "Unfurnished", label: "Unfurnished" },
      { value: "Semi-furnished", label: "Semi-furnished" },
    ], group: "Property" },
    { key: "rentAmount", label: "Annual rent (AED)", type: "number", required: true, validation: { min: 1 }, group: "Rent" },
    { key: "paymentMode", label: "Payment mode", type: "select", required: true, options: [
      { value: "1 cheque", label: "1 cheque" }, { value: "2 cheques", label: "2 cheques" },
      { value: "4 cheques", label: "4 cheques" }, { value: "6 cheques", label: "6 cheques" },
      { value: "12 cheques", label: "12 cheques" }, { value: "Bank transfer", label: "Bank transfer" },
    ], defaultValue: "4 cheques", group: "Rent" },
    { key: "depositAmount", label: "Security deposit (AED)", type: "number", required: true, validation: { min: 0 }, group: "Rent" },
    { key: "startDate", label: "Start date", type: "date", required: true, group: "Duration" },
    { key: "endDate", label: "End date", type: "date", required: true, group: "Duration" },
    { key: "ejariNumber", label: "Ejari registration number", type: "text", required: false, group: "Registration" },
  ],
  clauses: [
    { id: "parties", label: "§1 — Parties", required: true, text: "TENANCY CONTRACT\n\nThis contract is entered into between:\n\nLandlord: {landlordName}\nNationality: {landlordNationality}\nID: {landlordEmiratesId}\nAddress: {landlordAddress}\n\nTenant: {tenantName}\nNationality: {tenantNationality}\nID: {tenantEmiratesId}" },
    { id: "property", label: "§2 — Property", required: true, text: "The landlord agrees to lease the following property:\nAddress: {propertyAddress}\nType: {propertyType}\nArea: {surface} sq ft\nBedrooms: {rooms}\nCondition: {furnished}\nMakani: {makaniNumber}\nDEWA: {dewaNumber}" },
    { id: "rent", label: "§3 — Rent & Payment", required: true, text: "Annual rent: AED {rentAmount}\nPayment mode: {paymentMode}\nSecurity deposit: AED {depositAmount}\n\nThe security deposit shall be refunded upon vacating the property in its original condition." },
    { id: "duration", label: "§4 — Duration", required: true, text: "This tenancy contract is valid from {startDate} to {endDate}." },
    { id: "termination", label: "§5 — Termination", required: true, text: "Either party must provide 90 days' written notice before the end of the tenancy period as per RERA regulations. Early termination by the tenant requires payment of 2 months' rent as penalty unless otherwise agreed." },
    { id: "ejari", label: "§6 — Ejari Registration", required: true, text: "This contract must be registered with the Ejari system within 14 days of signing, as required by Dubai Land Department regulations. Ejari No.: {ejariNumber}" },
    { id: "maintenance", label: "§7 — Maintenance", required: true, text: "The landlord is responsible for structural maintenance. The tenant is responsible for minor repairs and maintenance of fixtures and fittings." },
  ],
};
export const aeRentReceipt = makeReceipt("AE", {
  label: "Rent Receipt (UAE)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "AED",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: AED {rentAmount}\n• Fees: AED {chargesAmount}\n• TOTAL: AED {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Saudi Arabia ───
export const saLeaseResidential = makeLease("SA", {
  label: "Tenancy Agreement (Saudi Arabia)",
  desc: "Standard tenancy agreement under the Ejar system.",
  legal: "Ejar system / Saudi tenancy regulations",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Annual rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "As per Ejar platform regulations and contract terms.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Annual rent: ${v}.`, currency: "SAR",
});
export const saRentReceipt = makeReceipt("SA", {
  label: "Rent Receipt (Saudi Arabia)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "SAR",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: SAR {rentAmount}\n• Fees: SAR {chargesAmount}\n• TOTAL: SAR {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Turkey ───
export const trLeaseResidential = makeLease("TR", {
  label: "Kira Sözleşmesi (Türkiye)",
  desc: "Borçlar Kanunu'na uygun kira sözleşmesi.",
  legal: "Türk Borçlar Kanunu",
  landlord: "Kiraya veren", landlordAddr: "Adres", tenant: "Kiracı", tenantAddr: "Adres",
  address: "Kiralanan adres", surface: "Alan", rooms: "Oda", rent: "Aylık kira", deposit: "Depozito",
  start: "Başlangıç tarihi", duration: "Süre", indefinite: "Belirsiz süreli", months12: "12 ay",
  parties: "Taraflar", property: "Kiralanan", rentClause: "Kira", termination: "Fesih",
  terminationText: "Kiracı 15 gün önceden yazılı bildirimde bulunarak sözleşmeyi feshedebilir.",
  partiesText: (v) => `KİRA SÖZLEŞMESİ\n\nKiraya veren: ${v}`,
  propertyText: (v) => `Kiralanan: ${v}.`,
  rentText: (v) => `Aylık kira: ${v}.`, currency: "₺",
});
export const trRentReceipt = makeReceipt("TR", {
  label: "Kira Makbuzu (Türkiye)", desc: "Kira ödeme makbuzu.",
  landlord: "Kiraya veren", tenant: "Kiracı", address: "Adres", rent: "Kira", charges: "Aidat",
  period: "Dönem", periodPlaceholder: "Ocak 2026", paymentDate: "Ödeme tarihi", currency: "₺",
  receiptText: "KİRA MAKBUZU\n\n{landlordName}, {tenantName}'den aşağıdaki ödemeyi aldığını onaylar:\n\n• Kira: {rentAmount} ₺\n• Aidat: {chargesAmount} ₺\n• TOPLAM: {totalAmount} ₺\n\nDönem: {period}, ödeme tarihi: {paymentDate}.\n\nİmza:",
});

// ─── Japan ───
export const jpLeaseResidential = makeLease("JP", {
  label: "賃貸借契約書 (日本)",
  desc: "借地借家法に基づく賃貸借契約。",
  legal: "借地借家法",
  landlord: "貸主", landlordAddr: "住所", tenant: "借主", tenantAddr: "住所",
  address: "物件所在地", surface: "面積", rooms: "部屋数", rent: "月額賃料", deposit: "敷金",
  start: "契約開始日", duration: "契約期間", indefinite: "期間の定めなし", months12: "12ヶ月",
  parties: "当事者", property: "物件", rentClause: "賃料", termination: "解約",
  terminationText: "借主は1ヶ月前の書面通知により解約可能。貸主は6ヶ月前の通知が必要。",
  partiesText: (v) => `賃貸借契約書\n\n貸主: ${v}`,
  propertyText: (v) => `物件: ${v}`,
  rentText: (v) => `月額賃料: ${v}`, currency: "¥",
});
export const jpRentReceipt = makeReceipt("JP", {
  label: "家賃領収書 (日本)", desc: "家賃支払いの領収書。",
  landlord: "貸主", tenant: "借主", address: "物件", rent: "賃料", charges: "管理費",
  period: "期間", periodPlaceholder: "2026年1月", paymentDate: "支払日", currency: "¥",
  receiptText: "家賃領収書\n\n{landlordName}は{tenantName}より下記を受領しました:\n\n• 賃料: ¥{rentAmount}\n• 管理費: ¥{chargesAmount}\n• 合計: ¥{totalAmount}\n\n期間: {period}、支払日: {paymentDate}\n\n署名:",
});

// ─── Australia ───
export const auLeaseResidential = makeLease("AU", {
  label: "Residential Tenancy Agreement (Australia)",
  desc: "Standard tenancy agreement under state Residential Tenancies Act.",
  legal: "Residential Tenancies Act (state-specific)",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Weekly rent", deposit: "Bond",
  start: "Start date", duration: "Duration", indefinite: "Periodic (month-to-month)", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Notice periods vary by state. Typically 14-28 days for tenant, 60-90 days for landlord.",
  partiesText: (v) => `RESIDENTIAL TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Rent: ${v}. Bond as specified.`, currency: "A$",
});
export const auRentReceipt = makeReceipt("AU", {
  label: "Rent Receipt (Australia)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Outgoings",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "A$",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: A$ {rentAmount}\n• Outgoings: A$ {chargesAmount}\n• TOTAL: A$ {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Singapore ───
export const sgLeaseResidential = makeLease("SG", {
  label: "Tenancy Agreement (Singapore)",
  desc: "Standard tenancy agreement under Singapore common law.",
  legal: "Common law / Stamp Duties Act",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Typically 2 months' notice with a diplomatic clause for early termination.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "S$",
});
export const sgRentReceipt = makeReceipt("SG", {
  label: "Rent Receipt (Singapore)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "S$",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: S$ {rentAmount}\n• Fees: S$ {chargesAmount}\n• TOTAL: S$ {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Argentina ───
export const arLeaseResidential = makeLease("AR", {
  label: "Contrato de Alquiler (Argentina)", desc: "Contrato conforme a la Ley de Alquileres.",
  legal: "Ley 27.551 de Alquileres", landlord: "Locador", landlordAddr: "Domicilio", tenant: "Locatario", tenantAddr: "Domicilio",
  address: "Dirección del inmueble", surface: "Superficie", rooms: "Ambientes", rent: "Alquiler mensual", deposit: "Depósito",
  start: "Fecha de inicio", duration: "Duración", indefinite: "Plazo indeterminado", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Alquiler", termination: "Rescisión",
  terminationText: "El locatario puede rescindir con 30 días de preaviso. Penalidad según ley vigente.",
  partiesText: (v) => `CONTRATO DE ALQUILER\n\nLocador: ${v}`, propertyText: (v) => `Inmueble en ${v}.`,
  rentText: (v) => `Alquiler mensual: ${v}.`, currency: "ARS",
});
export const arRentReceipt = makeReceipt("AR", {
  label: "Recibo de Alquiler (Argentina)", desc: "Recibo de pago.",
  landlord: "Locador", tenant: "Locatario", address: "Inmueble", rent: "Alquiler", charges: "Expensas",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "ARS",
  receiptText: "RECIBO DE ALQUILER\n\n{landlordName} confirma recepción de {tenantName}:\n\n• Alquiler: {rentAmount} ARS\n• Expensas: {chargesAmount} ARS\n• TOTAL: {totalAmount} ARS\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Chile ───
export const clLeaseResidential = makeLease("CL", {
  label: "Contrato de Arriendo (Chile)", desc: "Contrato conforme a la Ley 18.101.",
  legal: "Ley 18.101", landlord: "Arrendador", landlordAddr: "Domicilio", tenant: "Arrendatario", tenantAddr: "Domicilio",
  address: "Dirección", surface: "Superficie", rooms: "Habitaciones", rent: "Arriendo mensual", deposit: "Garantía",
  start: "Fecha de inicio", duration: "Duración", indefinite: "Indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Arriendo", termination: "Término",
  terminationText: "Desahucio con 2 meses de anticipación.",
  partiesText: (v) => `CONTRATO DE ARRIENDO\n\nArrendador: ${v}`, propertyText: (v) => `Inmueble en ${v}.`,
  rentText: (v) => `Arriendo mensual: ${v}.`, currency: "CLP",
});
export const clRentReceipt = makeReceipt("CL", {
  label: "Recibo de Arriendo (Chile)", desc: "Recibo de pago.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Arriendo", charges: "Gastos comunes",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "CLP",
  receiptText: "RECIBO\n\n{landlordName} confirma recepción de {tenantName}:\n\n• Arriendo: {rentAmount} CLP\n• Gastos: {chargesAmount} CLP\n• TOTAL: {totalAmount} CLP\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Colombia ───
export const coLeaseResidential = makeLease("CO", {
  label: "Contrato de Arrendamiento (Colombia)", desc: "Contrato conforme a la Ley 820 de 2003.",
  legal: "Ley 820 de 2003", landlord: "Arrendador", landlordAddr: "Dirección", tenant: "Arrendatario", tenantAddr: "Dirección",
  address: "Dirección del inmueble", surface: "Área", rooms: "Habitaciones", rent: "Canon mensual", deposit: "Depósito",
  start: "Fecha de inicio", duration: "Duración", indefinite: "Indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Canon", termination: "Terminación",
  terminationText: "Preaviso de 3 meses conforme a la Ley 820.",
  partiesText: (v) => `CONTRATO DE ARRENDAMIENTO\n\nArrendador: ${v}`, propertyText: (v) => `Inmueble en ${v}.`,
  rentText: (v) => `Canon mensual: ${v}.`, currency: "COP",
});
export const coRentReceipt = makeReceipt("CO", {
  label: "Recibo de Arriendo (Colombia)", desc: "Recibo de pago.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Canon", charges: "Administración",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "COP",
  receiptText: "RECIBO\n\n{landlordName} confirma recepción de {tenantName}:\n\n• Canon: {rentAmount} COP\n• Administración: {chargesAmount} COP\n• TOTAL: {totalAmount} COP\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Peru ───
export const peLeaseResidential = makeLease("PE", {
  label: "Contrato de Arrendamiento (Perú)", desc: "Contrato conforme al Código Civil peruano.",
  legal: "Código Civil Art. 1666-1712", landlord: "Arrendador", landlordAddr: "Domicilio", tenant: "Arrendatario", tenantAddr: "Domicilio",
  address: "Dirección", surface: "Área", rooms: "Habitaciones", rent: "Renta mensual", deposit: "Garantía",
  start: "Fecha de inicio", duration: "Duración", indefinite: "Indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Renta", termination: "Resolución",
  terminationText: "Preaviso de 30 días. Resolución por incumplimiento conforme al Código Civil.",
  partiesText: (v) => `CONTRATO DE ARRENDAMIENTO\n\nArrendador: ${v}`, propertyText: (v) => `Inmueble en ${v}.`,
  rentText: (v) => `Renta mensual: ${v}.`, currency: "PEN",
});
export const peRentReceipt = makeReceipt("PE", {
  label: "Recibo de Renta (Perú)", desc: "Recibo de pago.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Renta", charges: "Mantenimiento",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "PEN",
  receiptText: "RECIBO\n\n{landlordName} confirma recepción de {tenantName}:\n\n• Renta: {rentAmount} PEN\n• Mantenimiento: {chargesAmount} PEN\n• TOTAL: {totalAmount} PEN\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Algeria ───
export const dzLeaseResidential = makeLease("DZ", {
  label: "Contrat de bail (Algérie)", desc: "Contrat conforme au Code civil algérien.",
  legal: "Code civil algérien", landlord: "Bailleur", landlordAddr: "Adresse", tenant: "Locataire", tenantAddr: "Adresse",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer mensuel", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis de 3 mois conformément au Code civil.",
  partiesText: (v) => `CONTRAT DE BAIL\n\nBailleur: ${v}`, propertyText: (v) => `Bien situé à ${v}.`,
  rentText: (v) => `Loyer mensuel: ${v}.`, currency: "DZD",
});
export const dzRentReceipt = makeReceipt("DZ", {
  label: "Quittance de loyer (Algérie)", desc: "Quittance de paiement.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "DZD",
  receiptText: "QUITTANCE\n\n{landlordName} confirme la réception de {tenantName}:\n\n• Loyer: {rentAmount} DZD\n• Charges: {chargesAmount} DZD\n• TOTAL: {totalAmount} DZD\n\nPériode {period}, payé le {paymentDate}.\n\nSignature:",
});

// ─── Cameroon ───
export const cmLeaseResidential = makeLease("CM", {
  label: "Contrat de bail (Cameroun)", desc: "Contrat conforme au droit OHADA.",
  legal: "Droit OHADA", landlord: "Bailleur", landlordAddr: "Adresse", tenant: "Locataire", tenantAddr: "Adresse",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis de 3 mois.",
  partiesText: (v) => `CONTRAT DE BAIL\n\nBailleur: ${v}`, propertyText: (v) => `Bien situé à ${v}.`,
  rentText: (v) => `Loyer mensuel: ${v}.`, currency: "FCFA",
});
export const cmRentReceipt = makeReceipt("CM", {
  label: "Quittance (Cameroun)", desc: "Quittance de loyer.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "FCFA",
  receiptText: "QUITTANCE\n\n{landlordName} confirme réception de {tenantName}:\n\n• Loyer: {rentAmount} FCFA\n• Charges: {chargesAmount} FCFA\n• TOTAL: {totalAmount} FCFA\n\nPériode {period}, payé le {paymentDate}.\n\nSignature:",
});

// ─── Nigeria ───
export const ngLeaseResidential = makeLease("NG", {
  label: "Tenancy Agreement (Nigeria)", desc: "Standard tenancy agreement under Nigerian law.",
  legal: "Tenancy Law of Lagos / State laws", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Annual rent", deposit: "Caution deposit",
  start: "Start date", duration: "Duration", indefinite: "Periodic", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Notice per state tenancy law. Typically 6 months for yearly tenancies.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Rent: ${v}.`, currency: "₦",
});
export const ngRentReceipt = makeReceipt("NG", {
  label: "Rent Receipt (Nigeria)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Service charge",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "₦",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: ₦{rentAmount}\n• Service charge: ₦{chargesAmount}\n• TOTAL: ₦{totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Kenya ───
export const keLeaseResidential = makeLease("KE", {
  label: "Tenancy Agreement (Kenya)", desc: "Standard tenancy agreement under Kenyan law.",
  legal: "Landlord and Tenant (Shops, Hotels and Catering) Act", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "One month's written notice required for periodic tenancies.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "KES",
});
export const keRentReceipt = makeReceipt("KE", {
  label: "Rent Receipt (Kenya)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Service charge",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "KES",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: KES {rentAmount}\n• Service: KES {chargesAmount}\n• TOTAL: KES {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Ghana ───
export const ghLeaseResidential = makeLease("GH", {
  label: "Tenancy Agreement (Ghana)", desc: "Standard tenancy agreement under Ghanaian law.",
  legal: "Rent Act 220 of 1963", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Advance rent",
  start: "Start date", duration: "Duration", indefinite: "Periodic", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "3 months' notice required for termination.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "GHS",
});
export const ghRentReceipt = makeReceipt("GH", {
  label: "Rent Receipt (Ghana)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Service",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "GHS",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: GHS {rentAmount}\n• Service: GHS {chargesAmount}\n• TOTAL: GHS {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Qatar ───
export const qaLeaseResidential = makeLease("QA", {
  label: "Tenancy Contract (Qatar)", desc: "Standard tenancy contract under Qatari law.",
  legal: "Law No. 4 of 2008", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Annual rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "As per contract terms. Typically 2 months' notice.",
  partiesText: (v) => `TENANCY CONTRACT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Rent: ${v}.`, currency: "QAR",
});
export const qaRentReceipt = makeReceipt("QA", {
  label: "Rent Receipt (Qatar)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "QAR",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: QAR {rentAmount}\n• Fees: QAR {chargesAmount}\n• TOTAL: QAR {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Israel ───
export const ilLeaseResidential = makeLease("IL", {
  label: "הסכם שכירות (ישראל)", desc: "הסכם שכירות בהתאם לחוק השכירות והשאילה.",
  legal: "חוק השכירות והשאילה, תשל\"א-1971", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "As per contract terms. 90 days' notice for either party.",
  partiesText: (v) => `RENTAL AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "₪",
});
export const ilRentReceipt = makeReceipt("IL", {
  label: "Rent Receipt (Israel)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Va'ad Bayit",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "₪",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: ₪{rentAmount}\n• Va'ad: ₪{chargesAmount}\n• TOTAL: ₪{totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── South Korea ───
export const krLeaseResidential = makeLease("KR", {
  label: "임대차계약서 (대한민국)", desc: "주택임대차보호법에 따른 임대차계약.",
  legal: "주택임대차보호법", landlord: "임대인", landlordAddr: "주소", tenant: "임차인", tenantAddr: "주소",
  address: "소재지", surface: "면적", rooms: "방 수", rent: "월세", deposit: "보증금",
  start: "계약 시작일", duration: "기간", indefinite: "기간 미정", months12: "12개월",
  parties: "계약 당사자", property: "부동산", rentClause: "임대료", termination: "해지",
  terminationText: "임차인은 1개월 전 서면 통지로 해지 가능.",
  partiesText: (v) => `임대차계약서\n\n임대인: ${v}`, propertyText: (v) => `소재지: ${v}`,
  rentText: (v) => `월세: ${v}`, currency: "₩",
});
export const krRentReceipt = makeReceipt("KR", {
  label: "임대료 영수증 (대한민국)", desc: "임대료 수령 확인.",
  landlord: "임대인", tenant: "임차인", address: "소재지", rent: "월세", charges: "관리비",
  period: "기간", periodPlaceholder: "2026년 1월", paymentDate: "납부일", currency: "₩",
  receiptText: "임대료 영수증\n\n{landlordName}은(는) {tenantName}으로부터 아래 금액을 수령하였습니다:\n\n• 월세: ₩{rentAmount}\n• 관리비: ₩{chargesAmount}\n• 합계: ₩{totalAmount}\n\n기간: {period}, 납부일: {paymentDate}\n\n서명:",
});

// ─── India ───
export const inLeaseResidential = makeLease("IN", {
  label: "Rental Agreement (India)", desc: "Standard rental agreement under state-specific Rent Control Act.",
  legal: "State Rent Control Act / Transfer of Property Act", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "11 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month written notice. Agreement typically for 11 months to avoid registration.",
  partiesText: (v) => `RENTAL AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "₹",
});
export const inRentReceipt = makeReceipt("IN", {
  label: "Rent Receipt (India)", desc: "Rent payment receipt for HRA claims.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Maintenance",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "₹",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: ₹{rentAmount}\n• Maintenance: ₹{chargesAmount}\n• TOTAL: ₹{totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Thailand ───
export const thLeaseResidential = makeLease("TH", {
  label: "สัญญาเช่า (ไทย)", desc: "สัญญาเช่าตามประมวลกฎหมายแพ่งและพาณิชย์.",
  legal: "Civil and Commercial Code, Book III", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Lease up to 3 years does not need registration. 30 days' notice for periodic tenancies.",
  partiesText: (v) => `RENTAL AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "฿",
});
export const thRentReceipt = makeReceipt("TH", {
  label: "Rent Receipt (Thailand)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Common fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "฿",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: ฿{rentAmount}\n• Common fees: ฿{chargesAmount}\n• TOTAL: ฿{totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Malaysia ───
export const myLeaseResidential = makeLease("MY", {
  label: "Tenancy Agreement (Malaysia)", desc: "Standard tenancy agreement.",
  legal: "National Land Code / Contracts Act 1950", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's notice for periodic tenancy. Stamping required for validity.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "RM",
});
export const myRentReceipt = makeReceipt("MY", {
  label: "Rent Receipt (Malaysia)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Service charge",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "RM",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: RM {rentAmount}\n• Service: RM {chargesAmount}\n• TOTAL: RM {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Vietnam ───
export const vnLeaseResidential = makeLease("VN", {
  label: "Hợp đồng thuê nhà (Việt Nam)", desc: "Hợp đồng thuê nhà theo Bộ luật Dân sự 2015.",
  legal: "Bộ luật Dân sự 2015", landlord: "Bên cho thuê", landlordAddr: "Địa chỉ", tenant: "Bên thuê", tenantAddr: "Địa chỉ",
  address: "Địa chỉ nhà", surface: "Diện tích", rooms: "Phòng", rent: "Tiền thuê hàng tháng", deposit: "Tiền đặt cọc",
  start: "Ngày bắt đầu", duration: "Thời hạn", indefinite: "Không xác định", months12: "12 tháng",
  parties: "Các bên", property: "Nhà ở", rentClause: "Tiền thuê", termination: "Chấm dứt",
  terminationText: "Báo trước 30 ngày bằng văn bản.",
  partiesText: (v) => `HỢP ĐỒNG THUÊ NHÀ\n\nBên cho thuê: ${v}`, propertyText: (v) => `Nhà tại ${v}.`,
  rentText: (v) => `Tiền thuê: ${v}.`, currency: "VND",
});
export const vnRentReceipt = makeReceipt("VN", {
  label: "Biên lai thuê nhà (Việt Nam)", desc: "Biên lai thanh toán tiền thuê.",
  landlord: "Bên cho thuê", tenant: "Bên thuê", address: "Nhà ở", rent: "Tiền thuê", charges: "Phí dịch vụ",
  period: "Kỳ", periodPlaceholder: "Tháng 1/2026", paymentDate: "Ngày thanh toán", currency: "VND",
  receiptText: "BIÊN LAI\n\n{landlordName} xác nhận đã nhận từ {tenantName}:\n\n• Tiền thuê: {rentAmount} VND\n• Dịch vụ: {chargesAmount} VND\n• TỔNG: {totalAmount} VND\n\nKỳ: {period}, ngày thanh toán: {paymentDate}.\n\nChữ ký:",
});

// ─── Philippines ───
export const phLeaseResidential = makeLease("PH", {
  label: "Contract of Lease (Philippines)", desc: "Standard lease under the Rent Control Act.",
  legal: "RA 9653 (Rent Control Act of 2009)", landlord: "Lessor", landlordAddr: "Address", tenant: "Lessee", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "30 days' written notice required.",
  partiesText: (v) => `CONTRACT OF LEASE\n\nLessor: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "₱",
});
export const phRentReceipt = makeReceipt("PH", {
  label: "Rent Receipt (Philippines)", desc: "Rent receipt.",
  landlord: "Lessor", tenant: "Lessee", address: "Property", rent: "Rent", charges: "Association dues",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "₱",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: ₱{rentAmount}\n• Dues: ₱{chargesAmount}\n• TOTAL: ₱{totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Indonesia ───
export const idLeaseResidential = makeLease("ID", {
  label: "Perjanjian Sewa Menyewa (Indonesia)", desc: "Perjanjian sewa sesuai KUH Perdata.",
  legal: "KUH Perdata Pasal 1548-1600", landlord: "Pemilik", landlordAddr: "Alamat", tenant: "Penyewa", tenantAddr: "Alamat",
  address: "Alamat properti", surface: "Luas", rooms: "Kamar", rent: "Sewa bulanan", deposit: "Uang jaminan",
  start: "Tanggal mulai", duration: "Durasi", indefinite: "Tidak terbatas", months12: "12 bulan",
  parties: "Para Pihak", property: "Properti", rentClause: "Sewa", termination: "Pengakhiran",
  terminationText: "Pemberitahuan tertulis 1 bulan sebelumnya.",
  partiesText: (v) => `PERJANJIAN SEWA\n\nPemilik: ${v}`, propertyText: (v) => `Properti di ${v}.`,
  rentText: (v) => `Sewa bulanan: ${v}.`, currency: "IDR",
});
export const idRentReceipt = makeReceipt("ID", {
  label: "Kwitansi Sewa (Indonesia)", desc: "Kwitansi pembayaran sewa.",
  landlord: "Pemilik", tenant: "Penyewa", address: "Properti", rent: "Sewa", charges: "Iuran",
  period: "Periode", periodPlaceholder: "Januari 2026", paymentDate: "Tanggal bayar", currency: "IDR",
  receiptText: "KWITANSI SEWA\n\n{landlordName} menyatakan telah menerima dari {tenantName}:\n\n• Sewa: IDR {rentAmount}\n• Iuran: IDR {chargesAmount}\n• TOTAL: IDR {totalAmount}\n\nPeriode: {period}, dibayar {paymentDate}.\n\nTanda tangan:",
});

// ─── New Zealand ───
export const nzLeaseResidential = makeLease("NZ", {
  label: "Residential Tenancy Agreement (New Zealand)", desc: "Standard tenancy under the Residential Tenancies Act 1986.",
  legal: "Residential Tenancies Act 1986", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Weekly rent", deposit: "Bond",
  start: "Start date", duration: "Duration", indefinite: "Periodic", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "Tenant: 28 days' notice. Landlord: 90 days' notice for periodic tenancy.",
  partiesText: (v) => `RESIDENTIAL TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Rent: ${v}. Bond lodged with Tenancy Services.`, currency: "NZ$",
});
export const nzRentReceipt = makeReceipt("NZ", {
  label: "Rent Receipt (New Zealand)", desc: "Rent payment receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Outgoings",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "NZ$",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: NZ$ {rentAmount}\n• Outgoings: NZ$ {chargesAmount}\n• TOTAL: NZ$ {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Export all ───
export const allWorldTemplates: DocumentTemplate[] = [
  usLeaseResidential, usRentReceipt,
  caLeaseResidential, caRentReceipt,
  brLeaseResidential, brRentReceipt,
  mxLeaseResidential, mxRentReceipt,
  arLeaseResidential, arRentReceipt,
  clLeaseResidential, clRentReceipt,
  coLeaseResidential, coRentReceipt,
  peLeaseResidential, peRentReceipt,
  maLeaseResidential, maRentReceipt,
  tnLeaseResidential, tnRentReceipt,
  dzLeaseResidential, dzRentReceipt,
  snLeaseResidential, snRentReceipt,
  ciLeaseResidential, ciRentReceipt,
  cmLeaseResidential, cmRentReceipt,
  ngLeaseResidential, ngRentReceipt,
  keLeaseResidential, keRentReceipt,
  ghLeaseResidential, ghRentReceipt,
  zaLeaseResidential, zaRentReceipt,
  aeLeaseResidential, aeRentReceipt,
  saLeaseResidential, saRentReceipt,
  qaLeaseResidential, qaRentReceipt,
  ilLeaseResidential, ilRentReceipt,
  trLeaseResidential, trRentReceipt,
  jpLeaseResidential, jpRentReceipt,
  krLeaseResidential, krRentReceipt,
  inLeaseResidential, inRentReceipt,
  thLeaseResidential, thRentReceipt,
  myLeaseResidential, myRentReceipt,
  vnLeaseResidential, vnRentReceipt,
  phLeaseResidential, phRentReceipt,
  idLeaseResidential, idRentReceipt,
  auLeaseResidential, auRentReceipt,
  sgLeaseResidential, sgRentReceipt,
  nzLeaseResidential, nzRentReceipt,
];
