import type { DocumentTemplate } from "./types";

// ─── Helper factories (same as world-packs.ts) ───
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

// ─── Indonesia ───
export const idLeaseResidential = makeLease("ID", {
  label: "Perjanjian Sewa (Indonesia)", desc: "Perjanjian sewa berdasarkan KUH Perdata.",
  legal: "Kitab Undang-Undang Hukum Perdata", landlord: "Pemilik", landlordAddr: "Alamat", tenant: "Penyewa", tenantAddr: "Alamat",
  address: "Alamat properti", surface: "Luas", rooms: "Kamar", rent: "Sewa bulanan", deposit: "Uang jaminan",
  start: "Tanggal mulai", duration: "Jangka waktu", indefinite: "Tidak ditentukan", months12: "12 bulan",
  parties: "Para Pihak", property: "Properti", rentClause: "Sewa", termination: "Pengakhiran",
  terminationText: "Pemberitahuan tertulis 30 hari sebelumnya diperlukan.",
  partiesText: (v) => `PERJANJIAN SEWA MENYEWA\n\nPemilik: ${v}`, propertyText: (v) => `Properti di ${v}.`,
  rentText: (v) => `Sewa bulanan: ${v}.`, currency: "IDR",
});
export const idRentReceipt = makeReceipt("ID", {
  label: "Kwitansi Sewa (Indonesia)", desc: "Bukti pembayaran sewa.",
  landlord: "Pemilik", tenant: "Penyewa", address: "Properti", rent: "Sewa", charges: "Biaya layanan",
  period: "Periode", periodPlaceholder: "Januari 2026", paymentDate: "Tanggal bayar", currency: "IDR",
  receiptText: "KWITANSI SEWA\n\n{landlordName} mengonfirmasi penerimaan dari {tenantName}:\n\n• Sewa: Rp {rentAmount}\n• Layanan: Rp {chargesAmount}\n• TOTAL: Rp {totalAmount}\n\nPeriode: {period}, dibayar pada {paymentDate}.\n\nTanda tangan:",
});

// ─── New Zealand ───
export const nzLeaseResidential = makeLease("NZ", {
  label: "Residential Tenancy Agreement (New Zealand)", desc: "Standard tenancy agreement under the RTA 1986.",
  legal: "Residential Tenancies Act 1986", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Weekly rent", deposit: "Bond",
  start: "Start date", duration: "Duration", indefinite: "Periodic", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "21 days' notice for periodic tenancy (tenant). 90 days for landlord.",
  partiesText: (v) => `RESIDENTIAL TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Rent: ${v}. Bond as specified.`, currency: "NZ$",
});
export const nzRentReceipt = makeReceipt("NZ", {
  label: "Rent Receipt (New Zealand)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Outgoings",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "NZ$",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: NZ$ {rentAmount}\n• Outgoings: NZ$ {chargesAmount}\n• TOTAL: NZ$ {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Egypt ───
export const egLeaseResidential = makeLease("EG", {
  label: "عقد إيجار (مصر)", desc: "عقد إيجار وفقاً للقانون المدني المصري.",
  legal: "القانون المدني المصري / قانون الإيجارات", landlord: "المؤجر", landlordAddr: "العنوان", tenant: "المستأجر", tenantAddr: "العنوان",
  address: "عنوان العقار", surface: "المساحة", rooms: "الغرف", rent: "الإيجار الشهري", deposit: "التأمين",
  start: "تاريخ البدء", duration: "المدة", indefinite: "غير محددة", months12: "12 شهر",
  parties: "الأطراف", property: "العقار", rentClause: "الإيجار", termination: "الإنهاء",
  terminationText: "إخطار كتابي قبل 3 أشهر من انتهاء العقد.",
  partiesText: (v) => `عقد إيجار\n\nالمؤجر: ${v}`, propertyText: (v) => `العقار الكائن في ${v}.`,
  rentText: (v) => `الإيجار الشهري: ${v}.`, currency: "EGP",
});
export const egRentReceipt = makeReceipt("EG", {
  label: "إيصال إيجار (مصر)", desc: "إيصال سداد الإيجار.",
  landlord: "المؤجر", tenant: "المستأجر", address: "العقار", rent: "الإيجار", charges: "الرسوم",
  period: "الفترة", periodPlaceholder: "يناير 2026", paymentDate: "تاريخ الدفع", currency: "EGP",
  receiptText: "إيصال إيجار\n\nيقر {landlordName} باستلام من {tenantName}:\n\n• الإيجار: {rentAmount} ج.م\n• الرسوم: {chargesAmount} ج.م\n• الإجمالي: {totalAmount} ج.م\n\nعن فترة {period}، بتاريخ {paymentDate}.\n\nالتوقيع:",
});

// ─── Pakistan ───
export const pkLeaseResidential = makeLease("PK", {
  label: "Tenancy Agreement (Pakistan)", desc: "Standard tenancy agreement.",
  legal: "Rent Restriction Ordinance / Transfer of Property Act", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Security deposit",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "11 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "1 month's notice required for periodic tenancy.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "PKR",
});
export const pkRentReceipt = makeReceipt("PK", {
  label: "Rent Receipt (Pakistan)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Charges",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "PKR",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: PKR {rentAmount}\n• Charges: PKR {chargesAmount}\n• TOTAL: PKR {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Bangladesh ───
export const bdLeaseResidential = makeLease("BD", {
  label: "Tenancy Agreement (Bangladesh)", desc: "Standard tenancy agreement.",
  legal: "Transfer of Property Act / Premises Rent Control Act", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Advance",
  start: "Start date", duration: "Duration", indefinite: "Month-to-month", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "15 days' notice for monthly tenancy.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "BDT",
});
export const bdRentReceipt = makeReceipt("BD", {
  label: "Rent Receipt (Bangladesh)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Service",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "BDT",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: BDT {rentAmount}\n• Service: BDT {chargesAmount}\n• TOTAL: BDT {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── China ───
export const cnLeaseResidential = makeLease("CN", {
  label: "房屋租赁合同 (中国)", desc: "依据《合同法》及《商品房屋租赁管理办法》。",
  legal: "《民法典》第七百零三条", landlord: "出租方", landlordAddr: "地址", tenant: "承租方", tenantAddr: "地址",
  address: "房屋地址", surface: "面积", rooms: "房间数", rent: "月租金", deposit: "押金",
  start: "起始日期", duration: "租期", indefinite: "不定期", months12: "12个月",
  parties: "当事人", property: "房屋", rentClause: "租金", termination: "终止",
  terminationText: "提前30日书面通知可解除合同。",
  partiesText: (v) => `房屋租赁合同\n\n出租方：${v}`, propertyText: (v) => `房屋坐落于${v}。`,
  rentText: (v) => `月租金：${v}。`, currency: "¥",
});
export const cnRentReceipt = makeReceipt("CN", {
  label: "租金收据 (中国)", desc: "租金支付凭证。",
  landlord: "出租方", tenant: "承租方", address: "房屋", rent: "租金", charges: "物业费",
  period: "期间", periodPlaceholder: "2026年1月", paymentDate: "付款日期", currency: "¥",
  receiptText: "租金收据\n\n{landlordName}确认收到{tenantName}支付：\n\n• 租金：¥{rentAmount}\n• 物业费：¥{chargesAmount}\n• 合计：¥{totalAmount}\n\n期间：{period}，付款日：{paymentDate}\n\n签名：",
});

// ─── Ukraine ───
export const uaLeaseResidential = makeLease("UA", {
  label: "Договір оренди (Україна)", desc: "Договір оренди відповідно до ЦК України.",
  legal: "Цивільний кодекс України", landlord: "Орендодавець", landlordAddr: "Адреса", tenant: "Орендар", tenantAddr: "Адреса",
  address: "Адреса нерухомості", surface: "Площа", rooms: "Кімнати", rent: "Щомісячна орендна плата", deposit: "Завдаток",
  start: "Дата початку", duration: "Термін", indefinite: "Безстроковий", months12: "12 місяців",
  parties: "Сторони", property: "Нерухомість", rentClause: "Оренда", termination: "Припинення",
  terminationText: "Попередження за 1 місяць у письмовій формі.",
  partiesText: (v) => `ДОГОВІР ОРЕНДИ\n\nОрендодавець: ${v}`, propertyText: (v) => `Нерухомість за адресою ${v}.`,
  rentText: (v) => `Орендна плата: ${v}.`, currency: "₴",
});
export const uaRentReceipt = makeReceipt("UA", {
  label: "Квитанція (Україна)", desc: "Квитанція про сплату оренди.",
  landlord: "Орендодавець", tenant: "Орендар", address: "Нерухомість", rent: "Оренда", charges: "Комунальні",
  period: "Період", periodPlaceholder: "Січень 2026", paymentDate: "Дата оплати", currency: "₴",
  receiptText: "КВИТАНЦІЯ\n\n{landlordName} підтверджує отримання від {tenantName}:\n\n• Оренда: ₴{rentAmount}\n• Комунальні: ₴{chargesAmount}\n• ВСЬОГО: ₴{totalAmount}\n\nПеріод: {period}, сплачено {paymentDate}.\n\nПідпис:",
});

// ─── Jordan ───
export const joLeaseResidential = makeLease("JO", {
  label: "Tenancy Agreement (Jordan)", desc: "Standard tenancy agreement.",
  legal: "Landlord and Tenant Law No. 11 of 1994", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "As per contract terms. 3 months' notice typically required.",
  partiesText: (v) => `TENANCY AGREEMENT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "JOD",
});
export const joRentReceipt = makeReceipt("JO", {
  label: "Rent Receipt (Jordan)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "JOD",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: JOD {rentAmount}\n• Fees: JOD {chargesAmount}\n• TOTAL: JOD {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

// ─── Kuwait ───
export const kwLeaseResidential = makeLease("KW", {
  label: "Tenancy Contract (Kuwait)", desc: "Standard tenancy contract.",
  legal: "Kuwait Civil Code / Law No. 35/1978", landlord: "Landlord", landlordAddr: "Address", tenant: "Tenant", tenantAddr: "Address",
  address: "Property address", surface: "Area", rooms: "Rooms", rent: "Monthly rent", deposit: "Deposit",
  start: "Start date", duration: "Duration", indefinite: "Renewable", months12: "12 months",
  parties: "Parties", property: "Property", rentClause: "Rent", termination: "Termination",
  terminationText: "30 days' notice as per contract.",
  partiesText: (v) => `TENANCY CONTRACT\n\nLandlord: ${v}`, propertyText: (v) => `Property at ${v}.`,
  rentText: (v) => `Monthly rent: ${v}.`, currency: "KWD",
});
export const kwRentReceipt = makeReceipt("KW", {
  label: "Rent Receipt (Kuwait)", desc: "Rent receipt.",
  landlord: "Landlord", tenant: "Tenant", address: "Property", rent: "Rent", charges: "Fees",
  period: "Period", periodPlaceholder: "January 2026", paymentDate: "Payment date", currency: "KWD",
  receiptText: "RENT RECEIPT\n\n{landlordName} acknowledges receipt from {tenantName}:\n\n• Rent: KWD {rentAmount}\n• Fees: KWD {chargesAmount}\n• TOTAL: KWD {totalAmount}\n\nFor {period}, paid on {paymentDate}.\n\nSignature:",
});

export const allExtraWorldTemplates: DocumentTemplate[] = [
  idLeaseResidential, idRentReceipt,
  nzLeaseResidential, nzRentReceipt,
  egLeaseResidential, egRentReceipt,
  pkLeaseResidential, pkRentReceipt,
  bdLeaseResidential, bdRentReceipt,
  cnLeaseResidential, cnRentReceipt,
  uaLeaseResidential, uaRentReceipt,
  joLeaseResidential, joRentReceipt,
  kwLeaseResidential, kwRentReceipt,
];
