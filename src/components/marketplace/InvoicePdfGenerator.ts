import jsPDF from "jspdf";
import { toast } from "sonner";

interface InvoiceData {
  booking: any;
  service: any;
  provider: any;
  logoBase64?: string;
}

const FONT_SIZE = {
  title: 16,
  subtitle: 12,
  body: 10,
  small: 8,
  tiny: 7,
};

const COLORS = {
  primary: [30, 30, 30] as [number, number, number],
  secondary: [80, 80, 80] as [number, number, number],
  muted: [140, 140, 140] as [number, number, number],
  accent: [0, 102, 204] as [number, number, number],
  line: [210, 210, 210] as [number, number, number],
  bg: [248, 249, 250] as [number, number, number],
};

function loadLogoAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Blob | null> {
  const { booking, service, provider } = data;

  if (!provider?.invoicing_enabled) {
    toast.error("Invoicing is not enabled. Activate it in your provider profile.");
    return null;
  }

  const doc = new jsPDF();
  const margin = 20;
  const pageW = 190;
  let y = margin;

  // Try to load logo
  let logoB64: string | null = null;
  if (provider.avatar_url) {
    logoB64 = await loadLogoAsBase64(provider.avatar_url);
  }

  // ── Header with logo ──
  if (logoB64) {
    try {
      doc.addImage(logoB64, "PNG", margin, y, 20, 20);
    } catch { /* ignore */ }
  }
  const headerX = logoB64 ? margin + 25 : margin;

  const companyName = provider.invoice_company_name || provider.company_name || provider.display_name || "Provider";
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(companyName, headerX, y + 6);

  // Contact line
  doc.setFontSize(FONT_SIZE.small);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  const contactParts: string[] = [];
  if (provider.email) contactParts.push(provider.email);
  if (provider.phone) contactParts.push(provider.phone);
  if (contactParts.length) {
    doc.text(contactParts.join(" • "), headerX, y + 12);
  }

  // Address
  if (provider.invoice_address) {
    const lines = provider.invoice_address.split("\n");
    lines.forEach((line: string, i: number) => {
      doc.text(line.trim(), headerX, y + 17 + i * 4);
    });
  }

  // Tax ID
  if (provider.invoice_tax_id) {
    doc.setFontSize(FONT_SIZE.small);
    doc.text(`Tax ID: ${provider.invoice_tax_id}`, headerX, y + (provider.invoice_address ? 17 + provider.invoice_address.split("\n").length * 4 : 17));
  }

  y = Math.max(y + 24, logoB64 ? y + 24 : y + 20);
  y += 8;

  // ── Separator ──
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + pageW, y);
  y += 8;

  // ── Invoice number & date ──
  const prefix = provider.invoice_prefix || "INV";
  const num = String(provider.invoice_next_number || 1).padStart(4, "0");
  const invoiceNumber = `${prefix}-${num}`;
  const invoiceDate = new Date().toLocaleDateString("en-GB");

  doc.setFontSize(FONT_SIZE.subtitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(`INVOICE  ${invoiceNumber}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZE.body);
  doc.setTextColor(...COLORS.secondary);
  doc.text(`Date: ${invoiceDate}`, margin + pageW, y, { align: "right" });
  y += 10;

  // ── Bill To ──
  doc.setFillColor(...COLORS.bg);
  doc.roundedRect(margin, y, pageW, 28, 2, 2, "F");
  y += 6;
  doc.setFontSize(FONT_SIZE.small);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.muted);
  doc.text("BILL TO", margin + 4, y);
  y += 5;
  doc.setFontSize(FONT_SIZE.body);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(booking.booker_name || "Client", margin + 4, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  doc.text(booking.booker_email || "", margin + 4, y);
  if (booking.booker_phone) {
    doc.text(booking.booker_phone, margin + 100, y);
  }
  y += 12;

  y += 4;

  // ── Table header ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, pageW, 8, "F");
  y += 5.5;
  doc.setFontSize(FONT_SIZE.small);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Description", margin + 4, y);
  doc.text("Qty", 115, y, { align: "center" });
  doc.text("Unit Price", 145, y, { align: "center" });
  doc.text("Total", margin + pageW - 4, y, { align: "right" });
  y += 5;

  // ── Table row ──
  const title = service?.title || "Service";
  const dateInfo = booking.date_from && booking.date_to
    ? `${booking.date_from} → ${booking.date_to}`
    : booking.service_date || "";
  const qty = booking.quantity || 1;
  const totalPrice = Number(booking.total_price || 0);
  const unitPrice = service?.price || totalPrice / qty;
  const currency = booking.currency || "EUR";

  doc.setFillColor(255, 255, 255);
  y += 2;
  doc.setFontSize(FONT_SIZE.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.primary);
  doc.text(title, margin + 4, y);

  doc.setTextColor(...COLORS.secondary);
  doc.text(String(qty), 115, y, { align: "center" });
  doc.text(`${unitPrice.toLocaleString()} ${currency}`, 145, y, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(`${totalPrice.toLocaleString()} ${currency}`, margin + pageW - 4, y, { align: "right" });
  y += 5;

  if (dateInfo) {
    doc.setFontSize(FONT_SIZE.small);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(dateInfo, margin + 4, y);
    y += 5;
  }

  // ── Separator ──
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + pageW, y);
  y += 6;

  // ── Total ──
  doc.setFillColor(...COLORS.bg);
  doc.roundedRect(margin + 100, y - 2, 90, 12, 2, 2, "F");
  doc.setFontSize(FONT_SIZE.subtitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("TOTAL", margin + 104, y + 6);
  doc.text(`${totalPrice.toLocaleString()} ${currency}`, margin + pageW - 4, y + 6, { align: "right" });
  y += 18;

  // ── Payment status ──
  doc.setFontSize(FONT_SIZE.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  const paymentStatus = booking.payment_confirmed ? "✅ PAID" : "⏳ PENDING";
  doc.text(`Payment Status: ${paymentStatus}`, margin, y);
  y += 5;
  if (booking.payment_confirmed_at) {
    doc.text(`Paid on: ${new Date(booking.payment_confirmed_at).toLocaleDateString("en-GB")}`, margin, y);
    y += 5;
  }

  // ── Notes ──
  if (booking.notes) {
    y += 3;
    doc.setFontSize(FONT_SIZE.small);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Notes: ${booking.notes}`, margin, y);
    y += 5;
  }

  // ── Bank details ──
  if (provider.bank_iban || provider.bank_bic) {
    y += 6;
    doc.setDrawColor(...COLORS.line);
    doc.line(margin, y, margin + pageW, y);
    y += 6;
    doc.setFontSize(FONT_SIZE.small);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("BANK DETAILS FOR WIRE TRANSFER", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    if (provider.bank_holder) {
      doc.text(`Account Holder: ${provider.bank_holder}`, margin, y);
      y += 4;
    }
    if (provider.bank_iban) {
      doc.text(`IBAN: ${provider.bank_iban}`, margin, y);
      y += 4;
    }
    if (provider.bank_bic) {
      doc.text(`BIC/SWIFT: ${provider.bank_bic}`, margin, y);
      y += 4;
    }
    if (provider.bank_name) {
      doc.text(`Bank: ${provider.bank_name}`, margin, y);
      y += 4;
    }
  }

  // ── Footer ──
  doc.setFontSize(FONT_SIZE.tiny);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Generated by Easy-Locs® — ${invoiceNumber}`, margin, 280);
  doc.text(invoiceDate, margin + pageW, 280, { align: "right" });

  const fileName = `${invoiceNumber}-${booking.booker_name?.replace(/\s+/g, "-") || "invoice"}.pdf`;
  doc.save(fileName);
  toast.success(`Invoice ${invoiceNumber} generated!`);

  return doc.output("blob");
}

export function getInvoiceNumber(provider: any): string {
  const prefix = provider?.invoice_prefix || "INV";
  const num = String(provider?.invoice_next_number || 1).padStart(4, "0");
  return `${prefix}-${num}`;
}
