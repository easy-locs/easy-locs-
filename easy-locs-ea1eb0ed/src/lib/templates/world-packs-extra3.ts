import type { DocumentTemplate } from "./types";

function makeLease(
  country: string,
  lang: { label: string; desc: string; legal?: string; landlord: string; landlordAddr: string; tenant: string; tenantAddr: string; address: string; surface: string; rooms: string; rent: string; deposit: string; start: string; duration: string; indefinite: string; months12: string; parties: string; property: string; rentClause: string; termination: string; terminationText: string; partiesText: (v: string) => string; propertyText: (v: string) => string; rentText: (v: string) => string; surfaceUnit?: string; currency: string }
): DocumentTemplate {
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

// ─── India ───
export const inLease = makeLease("IN", {
  label: "Rental Agreement (India)", desc: "Standard rental agreement under Transfer of Property Act.",
  legal: "Transfer of Property Act 1882 / State Rent Control Acts",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "11 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's notice required. Governed by applicable State Rent Control Act.",
  partiesText: (v) => `RENTAL AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "INR",
});
export const inReceipt = makeReceipt("IN", {
  label: "Rent Receipt (India)", desc: "Rent receipt for HRA exemption.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Maintenance",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "INR",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: INR {rentAmount}\n• Maintenance: INR {chargesAmount}\n• TOTAL: INR {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nLandlord PAN: ___________\n\nSignature:",
});

// ─── Thailand ───
export const thLease = makeLease("TH", {
  label: "สัญญาเช่า (ไทย)", desc: "สัญญาเช่าตามประมวลกฎหมายแพ่งและพาณิชย์",
  legal: "ประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 537",
  landlord: "ผู้ให้เช่า", landlordAddr: "ที่อยู่", tenant: "ผู้เช่า", tenantAddr: "ที่อยู่",
  address: "ที่อยู่ทรัพย์สิน", surface: "พื้นที่", rooms: "ห้อง", rent: "ค่าเช่ารายเดือน", deposit: "เงินประกัน",
  start: "วันที่เริ่มต้น", duration: "ระยะเวลา", indefinite: "ไม่กำหนด", months12: "12 เดือน",
  parties: "คู่สัญญา", property: "ทรัพย์สิน", rentClause: "ค่าเช่า", termination: "การยกเลิก",
  terminationText: "แจ้งล่วงหน้า 30 วันเป็นลายลักษณ์อักษร",
  partiesText: (v) => `สัญญาเช่า\n\nผู้ให้เช่า: ${v}`,
  propertyText: (v) => `ทรัพย์สินตั้งอยู่ที่ ${v}`, rentText: (v) => `ค่าเช่ารายเดือน: ${v}`, currency: "THB",
});
export const thReceipt = makeReceipt("TH", {
  label: "ใบเสร็จค่าเช่า (ไทย)", desc: "ใบเสร็จรับเงินค่าเช่า",
  landlord: "ผู้ให้เช่า", tenant: "ผู้เช่า", address: "ทรัพย์สิน", rent: "ค่าเช่า", charges: "ค่าส่วนกลาง",
  period: "งวด", periodPlaceholder: "มกราคม 2569", paymentDate: "วันที่ชำระ", currency: "THB",
  receiptText: "ใบเสร็จค่าเช่า\n\n{landlordName} ยืนยันการรับเงินจาก {tenantName}:\n• ค่าเช่า: ฿{rentAmount}\n• ค่าส่วนกลาง: ฿{chargesAmount}\n• รวม: ฿{totalAmount}\n\nงวด: {period} ชำระเมื่อ {paymentDate}\n\nลงนาม:",
});

// ─── Nigeria ───
export const ngLease = makeLease("NG", {
  label: "Tenancy Agreement (Nigeria)", desc: "Standard tenancy agreement under Nigerian law.",
  legal: "Tenancy Law of Lagos State / Recovery of Premises Act",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Annual rent", deposit: "Caution fee",
  start: "Start date", duration: "Duration", indefinite: "Yearly renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "6 months' notice for yearly tenancy. 1 month for monthly tenancy.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Annual rent: ${v}.`, currency: "NGN",
});
export const ngReceipt = makeReceipt("NG", {
  label: "Rent Receipt (Nigeria)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Service charge",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "NGN",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: NGN {rentAmount}\n• Service charge: NGN {chargesAmount}\n• TOTAL: NGN {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Kenya ───
export const keLease = makeLease("KE", {
  label: "Tenancy Agreement (Kenya)", desc: "Standard tenancy agreement under Kenyan law.",
  legal: "Landlord and Tenant (Shops, Hotels and Catering Establishments) Act / Rent Restriction Act",
  landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's notice for monthly tenancy.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`,
  propertyText: (v) => `Property at ${v}.`, rentText: (v) => `Monthly rent: ${v}.`, currency: "KES",
});
export const keReceipt = makeReceipt("KE", {
  label: "Rent Receipt (Kenya)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Service charge",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "KES",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n• Rent: KES {rentAmount}\n• Service charge: KES {chargesAmount}\n• TOTAL: KES {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Colombia ───
export const coLease = makeLease("CO", {
  label: "Contrato de Arrendamiento (Colombia)", desc: "Contrato conforme a la Ley 820 de 2003.",
  legal: "Ley 820 de 2003",
  landlord: "Arrendador", landlordAddr: "Domicilio", tenant: "Arrendatario", tenantAddr: "Domicilio",
  address: "Dirección del inmueble", surface: "Área", rooms: "Habitaciones", rent: "Canon mensual", deposit: "Depósito",
  start: "Fecha de inicio", duration: "Plazo", indefinite: "Indefinido", months12: "12 meses",
  parties: "Partes", property: "Inmueble", rentClause: "Canon", termination: "Terminación",
  terminationText: "Preaviso de 3 meses con indemnización según Ley 820.",
  partiesText: (v) => `CONTRATO DE ARRENDAMIENTO\n\nArrendador: ${v}`,
  propertyText: (v) => `Inmueble ubicado en ${v}.`, rentText: (v) => `Canon mensual: ${v}.`, currency: "COP",
});
export const coReceipt = makeReceipt("CO", {
  label: "Recibo de Arriendo (Colombia)", desc: "Recibo de pago del canon de arrendamiento.",
  landlord: "Arrendador", tenant: "Arrendatario", address: "Inmueble", rent: "Canon", charges: "Administración",
  period: "Período", periodPlaceholder: "Enero 2026", paymentDate: "Fecha de pago", currency: "COP",
  receiptText: "RECIBO DE ARRIENDO\n\n{landlordName} confirma recepción de {tenantName}:\n• Canon: COP {rentAmount}\n• Administración: COP {chargesAmount}\n• TOTAL: COP {totalAmount}\n\nPeríodo: {period}, pagado el {paymentDate}.\n\nFirma:",
});

// ─── Russia ───
export const ruLease = makeLease("RU", {
  label: "Договор найма (Россия)", desc: "Договор найма жилого помещения по ГК РФ.",
  legal: "Гражданский кодекс РФ, глава 35",
  landlord: "Наймодатель", landlordAddr: "Адрес", tenant: "Наниматель", tenantAddr: "Адрес",
  address: "Адрес помещения", surface: "Площадь", rooms: "Комнаты", rent: "Ежемесячная плата", deposit: "Залог",
  start: "Дата начала", duration: "Срок", indefinite: "Бессрочный", months12: "12 месяцев",
  parties: "Стороны", property: "Помещение", rentClause: "Арендная плата", termination: "Расторжение",
  terminationText: "Предупреждение за 3 месяца в письменной форме (ст. 687 ГК РФ).",
  partiesText: (v) => `ДОГОВОР НАЙМА\n\nНаймодатель: ${v}`,
  propertyText: (v) => `Помещение по адресу: ${v}.`, rentText: (v) => `Ежемесячная плата: ${v}.`, currency: "RUB",
});
export const ruReceipt = makeReceipt("RU", {
  label: "Расписка (Россия)", desc: "Расписка о получении арендной платы.",
  landlord: "Наймодатель", tenant: "Наниматель", address: "Помещение", rent: "Арендная плата", charges: "Коммунальные",
  period: "Период", periodPlaceholder: "Январь 2026", paymentDate: "Дата оплаты", currency: "RUB",
  receiptText: "РАСПИСКА\n\n{landlordName} подтверждает получение от {tenantName}:\n• Аренда: {rentAmount} ₽\n• Коммунальные: {chargesAmount} ₽\n• ИТОГО: {totalAmount} ₽\n\nПериод: {period}, оплачено {paymentDate}.\n\nПодпись:",
});

export const allExtraWorldTemplates3: DocumentTemplate[] = [
  inLease, inReceipt,
  thLease, thReceipt,
  ngLease, ngReceipt,
  keLease, keReceipt,
  coLease, coReceipt,
  ruLease, ruReceipt,
];
