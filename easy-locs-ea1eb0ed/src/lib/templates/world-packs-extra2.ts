import type { DocumentTemplate } from "./types";

// ─── Helper factories ───
function makeLease(
  country: string,
  lang: { label: string; desc: string; legal?: string; landlord: string; landlordAddr: string; tenant: string; tenantAddr: string; address: string; surface: string; rooms: string; rent: string; deposit: string; start: string; duration: string; indefinite: string; months12: string; parties: string; property: string; rentClause: string; termination: string; terminationText: string; partiesText: (v: string) => string; propertyText: (v: string) => string; rentText: (v: string) => string; surfaceUnit?: string; currency: string }
): DocumentTemplate {
  return {
    id: `${country.toLowerCase()}-lease-residential`,
    version: "1.0.0",
    country: country as any,
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
      { key: "landlordSignature", label: "Signature", type: "text", required: false, group: lang.landlord },
      { key: "tenantName", label: lang.tenant, type: "text", required: true, validation: { minLength: 2 }, group: lang.tenant },
      { key: "tenantAddress", label: lang.tenantAddr, type: "text", required: false, group: lang.tenant },
      { key: "tenantSignature", label: "Signature", type: "text", required: false, group: lang.tenant },
      { key: "propertyAddress", label: lang.address, type: "text", required: true, group: lang.property },
      { key: "surface", label: `${lang.surface} (${lang.surfaceUnit || "m²"})`, type: "number", required: true, validation: { min: 1 }, group: lang.property },
      { key: "rooms", label: lang.rooms, type: "number", required: true, validation: { min: 1 }, group: lang.property },
      { key: "rentAmount", label: `${lang.rent} (${lang.currency})`, type: "number", required: true, validation: { min: 1 }, group: lang.rentClause },
      { key: "depositAmount", label: `${lang.deposit} (${lang.currency})`, type: "number", required: true, validation: { min: 0 }, group: lang.rentClause },
      { key: "startDate", label: lang.start, type: "date", required: true, group: lang.duration },
      { key: "duration", label: lang.duration, type: "select", required: true, options: [
        { value: "indefinite", label: lang.indefinite },
        { value: "12", label: lang.months12 },
      ], defaultValue: "12", group: lang.duration },
      { key: "signatureDate", label: "Date", type: "date", required: false, group: "Signature" },
      { key: "signaturePlace", label: "Place", type: "text", required: false, group: "Signature" },
    ],
    clauses: [
      { id: "parties", label: `§1 — ${lang.parties}`, required: true, text: lang.partiesText("{landlordName}, {landlordAddress}\n{tenantName}") },
      { id: "property", label: `§2 — ${lang.property}`, required: true, text: lang.propertyText("{propertyAddress}, {surface}, {rooms}") },
      { id: "rent", label: `§3 — ${lang.rentClause}`, required: true, text: lang.rentText("{rentAmount}, {depositAmount}") },
      { id: "termination", label: `§4 — ${lang.termination}`, required: true, text: lang.terminationText },
      { id: "signatures", label: "§5 — Signatures", required: true, text: "Done at {signaturePlace} on {signatureDate}.\n\nLandlord signature: ___________________\n\nTenant signature: ___________________\n\nWitness (if applicable): ___________________" },
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
    country: country as any,
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

// ─── Bahrain ───
export const bhLease = makeLease("BH", {
  label: "Tenancy Contract (Bahrain)", desc: "Standard tenancy contract.", legal: "Civil Code of Bahrain",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "3 months' notice as per contract.", partiesText: (v) => `TENANCY CONTRACT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "BHD",
});
export const bhReceipt = makeReceipt("BH", {
  label: "Rent Receipt (Bahrain)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Fees", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "BHD",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: BHD {rentAmount}\n• Fees: BHD {chargesAmount}\n• TOTAL: BHD {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Oman ───
export const omLease = makeLease("OM", {
  label: "Tenancy Contract (Oman)", desc: "Standard tenancy contract.", legal: "Civil Transactions Law",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "As per contract terms.", partiesText: (v) => `TENANCY CONTRACT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "OMR",
});
export const omReceipt = makeReceipt("OM", {
  label: "Rent Receipt (Oman)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Fees", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "OMR",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: OMR {rentAmount}\n• Fees: OMR {chargesAmount}\n• TOTAL: OMR {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Ethiopia ───
export const etLease = makeLease("ET", {
  label: "Tenancy Agreement (Ethiopia)", desc: "Standard tenancy agreement.", legal: "Civil Code of Ethiopia",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's notice required.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "ETB",
});
export const etReceipt = makeReceipt("ET", {
  label: "Rent Receipt (Ethiopia)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Service", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "ETB",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: ETB {rentAmount}\n• Service: ETB {chargesAmount}\n• TOTAL: ETB {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Tanzania ───
export const tzLease = makeLease("TZ", {
  label: "Tenancy Agreement (Tanzania)", desc: "Standard tenancy agreement.", legal: "Rent Restriction Act",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "3 months' written notice required.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "TZS",
});
export const tzReceipt = makeReceipt("TZ", {
  label: "Rent Receipt (Tanzania)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Service", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "TZS",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: TZS {rentAmount}\n• Service: TZS {chargesAmount}\n• TOTAL: TZS {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Uganda ───
export const ugLease = makeLease("UG", {
  label: "Tenancy Agreement (Uganda)", desc: "Standard tenancy agreement.", legal: "Landlord and Tenant Act",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's notice required.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "UGX",
});
export const ugReceipt = makeReceipt("UG", {
  label: "Rent Receipt (Uganda)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Service", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "UGX",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: UGX {rentAmount}\n• Service: UGX {chargesAmount}\n• TOTAL: UGX {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Rwanda ───
export const rwLease = makeLease("RW", {
  label: "Tenancy Agreement (Rwanda)", desc: "Standard tenancy agreement.", legal: "Law N°13/2010",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "3 months' notice required.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "RWF",
});
export const rwReceipt = makeReceipt("RW", {
  label: "Rent Receipt (Rwanda)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Service", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "RWF",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: RWF {rentAmount}\n• Service: RWF {chargesAmount}\n• TOTAL: RWF {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Mauritius ───
export const muLease = makeLease("MU", {
  label: "Contrat de bail (Maurice)", desc: "Contrat de bail conforme au Code civil mauricien.",
  legal: "Code civil mauricien", landlord: "Bailleur", landlordAddr: "Adresse", tenant: "Locataire", tenantAddr: "Adresse",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer mensuel", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis de 3 mois.", partiesText: (v) => `CONTRAT DE BAIL\n\nBailleur: ${v}`,
  propertyText: (v) => `Bien situé à ${v}.`, rentText: (v) => `Loyer mensuel: ${v}.`, currency: "MUR",
});
export const muReceipt = makeReceipt("MU", {
  label: "Quittance de loyer (Maurice)", desc: "Quittance de paiement.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "MUR",
  receiptText: "QUITTANCE\n\n{landlordName} confirme réception de {tenantName}:\n• Loyer: {rentAmount} MUR\n• Charges: {chargesAmount} MUR\n• TOTAL: {totalAmount} MUR\n\nPériode {period}, payé le {paymentDate}.\n\nSignature:",
});

// ─── Lebanon ───
export const lbLease = makeLease("LB", {
  label: "Contrat de bail (Liban)", desc: "Contrat de bail conforme à la loi libanaise.",
  legal: "Code des obligations et contrats", landlord: "Bailleur", landlordAddr: "Adresse", tenant: "Locataire", tenantAddr: "Adresse",
  address: "Adresse du bien", surface: "Superficie", rooms: "Pièces", rent: "Loyer mensuel", deposit: "Caution",
  start: "Date de début", duration: "Durée", indefinite: "Indéterminée", months12: "12 mois",
  parties: "Parties", property: "Bien", rentClause: "Loyer", termination: "Résiliation",
  terminationText: "Préavis selon la loi libanaise.", partiesText: (v) => `CONTRAT DE BAIL\n\nBailleur: ${v}`,
  propertyText: (v) => `Bien situé à ${v}.`, rentText: (v) => `Loyer mensuel: ${v}.`, currency: "USD",
});
export const lbReceipt = makeReceipt("LB", {
  label: "Quittance de loyer (Liban)", desc: "Quittance de paiement.",
  landlord: "Bailleur", tenant: "Locataire", address: "Bien", rent: "Loyer", charges: "Charges",
  period: "Période", periodPlaceholder: "Janvier 2026", paymentDate: "Date de paiement", currency: "USD",
  receiptText: "QUITTANCE\n\n{landlordName} confirme réception de {tenantName}:\n• Loyer: ${rentAmount}\n• Charges: ${chargesAmount}\n• TOTAL: ${totalAmount}\n\nPériode {period}, payé le {paymentDate}.\n\nSignature:",
});

// ─── Iraq ───
export const iqLease = makeLease("IQ", {
  label: "Tenancy Agreement (Iraq)", desc: "Standard tenancy agreement.", legal: "Iraqi Civil Code",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "As per contract terms.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "IQD",
});
export const iqReceipt = makeReceipt("IQ", {
  label: "Rent Receipt (Iraq)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Fees", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "IQD",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: IQD {rentAmount}\n• Fees: IQD {chargesAmount}\n• TOTAL: IQD {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Nepal ───
export const npLease = makeLease("NP", {
  label: "Tenancy Agreement (Nepal)", desc: "Standard tenancy agreement.", legal: "House and Land Rent (Control) Act",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Advance",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "35 days' notice required.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "NPR",
});
export const npReceipt = makeReceipt("NP", {
  label: "Rent Receipt (Nepal)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Service", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "NPR",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: NPR {rentAmount}\n• Service: NPR {chargesAmount}\n• TOTAL: NPR {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Sri Lanka ───
export const lkLease = makeLease("LK", {
  label: "Tenancy Agreement (Sri Lanka)", desc: "Standard tenancy agreement.", legal: "Rent Act No. 7 of 1972",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's written notice required.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "LKR",
});
export const lkReceipt = makeReceipt("LK", {
  label: "Rent Receipt (Sri Lanka)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Service", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "LKR",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: LKR {rentAmount}\n• Service: LKR {chargesAmount}\n• TOTAL: LKR {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Cambodia ───
export const khLease = makeLease("KH", {
  label: "Tenancy Agreement (Cambodia)", desc: "Standard tenancy agreement.", legal: "Civil Code of Cambodia",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "30 days' notice required.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "USD",
});
export const khReceipt = makeReceipt("KH", {
  label: "Rent Receipt (Cambodia)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Service", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "USD",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: ${rentAmount}\n• Service: ${chargesAmount}\n• TOTAL: ${totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Taiwan ───
export const twLease = makeLease("TW", {
  label: "租賃契約 (臺灣)", desc: "依據民法租賃章節之租賃契約。",
  legal: "民法 第421條", landlord: "出租人", landlordAddr: "地址", tenant: "承租人", tenantAddr: "地址",
  address: "房屋地址", surface: "面積", rooms: "房間數", rent: "月租金", deposit: "押金",
  start: "起始日", duration: "租期", indefinite: "不定期", months12: "12個月",
  parties: "當事人", property: "房屋", rentClause: "租金", termination: "終止",
  terminationText: "提前一個月書面通知。", partiesText: (v) => `租賃契約\n\n出租人：${v}`,
  propertyText: (v) => `房屋坐落於${v}。`, rentText: (v) => `月租金：${v}。`, currency: "TWD",
});
export const twReceipt = makeReceipt("TW", {
  label: "租金收據 (臺灣)", desc: "租金支付收據。",
  landlord: "出租人", tenant: "承租人", address: "房屋", rent: "租金", charges: "管理費",
  period: "期間", periodPlaceholder: "2026年1月", paymentDate: "付款日期", currency: "TWD",
  receiptText: "租金收據\n\n{landlordName}確認收到{tenantName}支付：\n• 租金：NT$ {rentAmount}\n• 管理費：NT$ {chargesAmount}\n• 合計：NT$ {totalAmount}\n\n期間：{period}，付款日：{paymentDate}\n\n簽名：",
});

// ─── Hong Kong ───
export const hkLease = makeLease("HK", {
  label: "Tenancy Agreement (Hong Kong)", desc: "Standard tenancy agreement under HK common law.",
  legal: "Landlord and Tenant (Consolidation) Ordinance", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months (fixed)",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's notice. Break clause per agreement.", partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "HKD",
});
export const hkReceipt = makeReceipt("HK", {
  label: "Rent Receipt (Hong Kong)", desc: "Rent receipt.", landlord: "Landlord", tenant: "Tenant",
  address: "Property", rent: "Rent", charges: "Management fees", period: "Period", periodPlaceholder: "January 2026",
  paymentDate: "Payment date", currency: "HKD",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: HKD {rentAmount}\n• Mgmt fees: HKD {chargesAmount}\n• TOTAL: HKD {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Dominican Republic ───
export const doLease = makeLease("DO", {
  label: "Contrato de Alquiler (Rep. Dominicana)", desc: "Contrato conforme al Código Civil dominicano.",
  legal: "Código Civil / Ley 4314 de 1955", landlord: "Arrendador", landlordAddr: "Domicilio", tenant: "Arrendatario", tenantAddr: "Domicilio",
  address: "Dirección del inmueble", surface: "Superficie", rooms: "Habitaciones", rent: "Alquiler mensual", deposit: "Depósito",
  start: "Fecha de inicio", duration: "Duración", indefinite: "Indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Alquiler", termination: "Terminación",
  terminationText: "Preaviso de 90 días.", partiesText: (v) => `CONTRATO DE ALQUILER\n\nArrendador: ${v}`,
  propertyText: (v) => `Inmueble en ${v}.`, rentText: (v) => `Alquiler mensual: ${v}.`, currency: "DOP",
});
export const doReceipt = makeReceipt("DO", {
  label: "Recibo de Alquiler (Rep. Dominicana)", desc: "Recibo de pago.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Alquiler", charges: "Gastos",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "DOP",
  receiptText: "RECIBO\n\n{landlordName} confirma recepción de {tenantName}:\n• Alquiler: {rentAmount} DOP\n• Gastos: {chargesAmount} DOP\n• TOTAL: {totalAmount} DOP\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Costa Rica ───
export const crLease = makeLease("CR", {
  label: "Contrato de Arrendamiento (Costa Rica)", desc: "Contrato conforme a la Ley de Arrendamientos.",
  legal: "Ley General de Arrendamientos N° 7527", landlord: "Arrendador", landlordAddr: "Domicilio", tenant: "Arrendatario", tenantAddr: "Domicilio",
  address: "Dirección", surface: "Área", rooms: "Habitaciones", rent: "Alquiler mensual", deposit: "Garantía",
  start: "Fecha de inicio", duration: "Plazo", indefinite: "Indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Alquiler", termination: "Terminación",
  terminationText: "Preaviso de 3 meses según Ley 7527.", partiesText: (v) => `CONTRATO DE ARRENDAMIENTO\n\nArrendador: ${v}`,
  propertyText: (v) => `Inmueble en ${v}.`, rentText: (v) => `Alquiler mensual: ${v}.`, currency: "CRC",
});
export const crReceipt = makeReceipt("CR", {
  label: "Recibo de Alquiler (Costa Rica)", desc: "Recibo de pago.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Alquiler", charges: "Gastos",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "CRC",
  receiptText: "RECIBO\n\n{landlordName} confirma recepción de {tenantName}:\n• Alquiler: ₡{rentAmount}\n• Gastos: ₡{chargesAmount}\n• TOTAL: ₡{totalAmount}\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Panama ───
export const paLease = makeLease("PA", {
  label: "Contrato de Arrendamiento (Panamá)", desc: "Contrato conforme al Código Civil panameño.",
  legal: "Código Civil / Ley de Arrendamientos", landlord: "Arrendador", landlordAddr: "Domicilio", tenant: "Arrendatario", tenantAddr: "Domicilio",
  address: "Dirección", surface: "Área", rooms: "Habitaciones", rent: "Alquiler mensual", deposit: "Depósito",
  start: "Fecha de inicio", duration: "Plazo", indefinite: "Indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Alquiler", termination: "Terminación",
  terminationText: "Preaviso de 30 días.", partiesText: (v) => `CONTRATO DE ARRENDAMIENTO\n\nArrendador: ${v}`,
  propertyText: (v) => `Inmueble en ${v}.`, rentText: (v) => `Alquiler mensual: ${v}.`, currency: "USD",
});
export const paReceipt = makeReceipt("PA", {
  label: "Recibo de Alquiler (Panamá)", desc: "Recibo de pago.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Alquiler", charges: "Gastos",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "USD",
  receiptText: "RECIBO\n\n{landlordName} confirma recepción de {tenantName}:\n• Alquiler: ${rentAmount}\n• Gastos: ${chargesAmount}\n• TOTAL: ${totalAmount}\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

export const allExtraWorldTemplates2: DocumentTemplate[] = [
  bhLease, bhReceipt, omLease, omReceipt,
  etLease, etReceipt, tzLease, tzReceipt, ugLease, ugReceipt, rwLease, rwReceipt,
  muLease, muReceipt, lbLease, lbReceipt, iqLease, iqReceipt,
  npLease, npReceipt, lkLease, lkReceipt, khLease, khReceipt,
  twLease, twReceipt, hkLease, hkReceipt,
  doLease, doReceipt, crLease, crReceipt, paLease, paReceipt,
];
