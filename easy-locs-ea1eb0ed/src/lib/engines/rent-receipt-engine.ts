import type { CurrencyCode } from "@/domains/shared/canonical-types";
import { isRentReceiptMandatory, getCountryRules } from "@/domains/real-estate/country-rules";
import { platformBus } from "@/lib/shared/platform-bus";
import type { RentCall } from "./rent-call-engine";

export interface RentReceipt {
  id: string;
  rentCallId: string;
  leaseId: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  periodLabel: string;
  rentAmount: number;
  chargesAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  paidAt: string;
  paymentMethod: string;
  receiptNumber: string;
  countryCode: string;
  legalText: string;
  generatedAt: string;
  documentUrl?: string;
  archived: boolean;
}

export interface ReceiptGenerationResult {
  receipt: Omit<RentReceipt, "id" | "documentUrl">;
  pdfData: ReceiptPdfData;
  mandatory: boolean;
}

export interface ReceiptPdfData {
  title: string;
  subtitle: string;
  landlordSection: { label: string; fields: { key: string; value: string }[] };
  tenantSection: { label: string; fields: { key: string; value: string }[] };
  propertySection: { label: string; fields: { key: string; value: string }[] };
  paymentSection: { label: string; rows: { label: string; amount: string }[]; total: { label: string; amount: string } };
  legalFooter: string;
  signatureLine: string;
  dateLabel: string;
}

const RECEIPT_LABELS: Record<string, {
  title: string;
  subtitle: string;
  landlord: string;
  tenant: string;
  property: string;
  payment: string;
  rent: string;
  charges: string;
  total: string;
  legal: string;
  signature: string;
  date: string;
}> = {
  FR: {
    title: "QUITTANCE DE LOYER",
    subtitle: "Article 22-1 de la loi du 6 juillet 1989",
    landlord: "BAILLEUR",
    tenant: "LOCATAIRE",
    property: "BIEN LOUÉ",
    payment: "DÉTAIL DU PAIEMENT",
    rent: "Loyer",
    charges: "Charges",
    total: "Total",
    legal: "Je soussigné(e), bailleur du logement désigné ci-dessus, déclare avoir reçu la somme indiquée au titre du paiement du loyer et des charges pour la période mentionnée, et en donne quittance, sous réserve de tous mes droits.",
    signature: "Fait à __________, le",
    date: "Date",
  },
  default: {
    title: "RENT RECEIPT",
    subtitle: "Official payment confirmation",
    landlord: "LANDLORD",
    tenant: "TENANT",
    property: "PROPERTY",
    payment: "PAYMENT DETAILS",
    rent: "Rent",
    charges: "Charges",
    total: "Total",
    legal: "I, the undersigned landlord of the property described above, acknowledge receipt of the amount indicated for the period mentioned, and issue this receipt.",
    signature: "Done at __________, on",
    date: "Date",
  },
  AR: {
    title: "إيصال إيجار",
    subtitle: "تأكيد الدفع الرسمي",
    landlord: "المؤجر",
    tenant: "المستأجر",
    property: "العقار",
    payment: "تفاصيل الدفع",
    rent: "الإيجار",
    charges: "الرسوم",
    total: "المجموع",
    legal: "أقر أنا الموقع أدناه، مالك العقار المذكور أعلاه، بأنني تلقيت المبلغ المحدد عن الفترة المذكورة، وأصدر هذا الإيصال.",
    signature: "حرر في __________، بتاريخ",
    date: "التاريخ",
  },
};

function generateReceiptNumber(leaseId: string, period: string): string {
  const hash = `${leaseId}-${period}`.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return `REC-${Math.abs(hash).toString(36).toUpperCase().slice(0, 8)}`;
}

function getLabels(countryCode: string) {
  const rules = getCountryRules(countryCode);
  const lang = rules.languages[0];
  if (lang === "fr") return RECEIPT_LABELS.FR;
  if (lang === "ar") return RECEIPT_LABELS.AR;
  return RECEIPT_LABELS.default;
}

function formatCurrency(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function generateRentReceipt(
  call: RentCall,
  landlordInfo: { name: string; address: string },
  tenantInfo: { name: string; address: string },
  propertyInfo: { label: string; address: string },
  countryCode: string,
): ReceiptGenerationResult {
  const labels = getLabels(countryCode);
  const mandatory = isRentReceiptMandatory(countryCode);
  const receiptNumber = generateReceiptNumber(call.leaseId, call.periodLabel);
  const now = new Date().toISOString();

  const receipt: Omit<RentReceipt, "id" | "documentUrl"> = {
    rentCallId: call.id,
    leaseId: call.leaseId,
    propertyId: call.propertyId,
    tenantId: call.tenantId,
    landlordId: call.landlordId,
    periodLabel: call.periodLabel,
    rentAmount: call.amount,
    chargesAmount: call.chargesAmount,
    totalAmount: call.totalAmount,
    currency: call.currency,
    paidAt: call.paidAt ?? now,
    paymentMethod: call.paymentMethod ?? "wallet",
    receiptNumber,
    countryCode,
    legalText: labels.legal,
    generatedAt: now,
    archived: false,
  };

  const pdfData: ReceiptPdfData = {
    title: labels.title,
    subtitle: labels.subtitle,
    landlordSection: {
      label: labels.landlord,
      fields: [
        { key: "Name", value: landlordInfo.name },
        { key: "Address", value: landlordInfo.address },
      ],
    },
    tenantSection: {
      label: labels.tenant,
      fields: [
        { key: "Name", value: tenantInfo.name },
        { key: "Address", value: tenantInfo.address },
      ],
    },
    propertySection: {
      label: labels.property,
      fields: [
        { key: "Property", value: propertyInfo.label },
        { key: "Address", value: propertyInfo.address },
      ],
    },
    paymentSection: {
      label: labels.payment,
      rows: [
        { label: `${labels.rent} — ${call.periodLabel}`, amount: formatCurrency(call.amount, call.currency) },
        { label: labels.charges, amount: formatCurrency(call.chargesAmount, call.currency) },
      ],
      total: { label: labels.total, amount: formatCurrency(call.totalAmount, call.currency) },
    },
    legalFooter: labels.legal,
    signatureLine: labels.signature,
    dateLabel: `${labels.date}: ${new Date(call.paidAt ?? now).toLocaleDateString()}`,
  };

  platformBus.emit("receipt.generated", {
    receiptNumber,
    leaseId: call.leaseId,
    tenantId: call.tenantId,
    period: call.periodLabel,
    amount: call.totalAmount,
    mandatory,
  });

  return { receipt, pdfData, mandatory };
}
