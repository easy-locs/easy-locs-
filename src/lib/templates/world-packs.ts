import type { DocumentTemplate } from "./types";

// ─── Helper to build a standard residential lease template ───
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
      { key: "tenantName", label: lang.tenant, type: "text", required: true, validation: { minLength: 2 }, group: lang.tenant },
      { key: "tenantAddress", label: lang.tenantAddr, type: "text", required: false, group: lang.tenant },
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
    ],
    clauses: [
      { id: "parties", label: `§1 — ${lang.parties}`, required: true, text: lang.partiesText("{landlordName}, {landlordAddress}\n{tenantName}") },
      { id: "property", label: `§2 — ${lang.property}`, required: true, text: lang.propertyText("{propertyAddress}, {surface}, {rooms}") },
      { id: "rent", label: `§3 — ${lang.rentClause}`, required: true, text: lang.rentText("{rentAmount}, {depositAmount}") },
      { id: "termination", label: `§4 — ${lang.termination}`, required: true, text: lang.terminationText },
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

// ─── UAE ───
export const aeLeaseResidential = makeLease("AE", {
  label: "Tenancy Contract (UAE)",
  desc: "Standard tenancy contract under RERA regulations.",
  legal: "RERA / Dubai Law No. 26 of 2007",
  landlord: "Landlord", landlordAddr: "Landlord address", tenant: "Tenant", tenantAddr: "Tenant address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Annual rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable annually", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "90 days' notice required before the end of the tenancy period per RERA.",
  partiesText: (v) => `TENANCY CONTRACT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Rent: ${v}.`, currency: "AED",
});
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

// ─── Export all ───
export const allWorldTemplates: DocumentTemplate[] = [
  usLeaseResidential, usRentReceipt,
  caLeaseResidential, caRentReceipt,
  brLeaseResidential, brRentReceipt,
  mxLeaseResidential, mxRentReceipt,
  maLeaseResidential, maRentReceipt,
  tnLeaseResidential, tnRentReceipt,
  snLeaseResidential, snRentReceipt,
  ciLeaseResidential, ciRentReceipt,
  zaLeaseResidential, zaRentReceipt,
  aeLeaseResidential, aeRentReceipt,
  saLeaseResidential, saRentReceipt,
  trLeaseResidential, trRentReceipt,
  jpLeaseResidential, jpRentReceipt,
  auLeaseResidential, auRentReceipt,
  sgLeaseResidential, sgRentReceipt,
];
