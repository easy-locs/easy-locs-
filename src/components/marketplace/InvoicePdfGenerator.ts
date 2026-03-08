import jsPDF from "jspdf";
import { toast } from "sonner";

interface InvoiceData {
  booking: any;
  service: any;
  provider: any;
}

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
      try { resolve(canvas.toDataURL("image/png")); } catch { resolve(null); }
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
  const M = 20; // margin
  const W = 170; // content width
  const RX = M + W; // right edge
  let y = M;

  // Colors
  const C = {
    black: [25, 25, 25] as [number, number, number],
    dark: [60, 60, 60] as [number, number, number],
    mid: [110, 110, 110] as [number, number, number],
    light: [170, 170, 170] as [number, number, number],
    bg: [245, 246, 248] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    blue: [0, 82, 180] as [number, number, number],
    blueBg: [235, 243, 255] as [number, number, number],
  };

  const setColor = (c: [number, number, number]) => doc.setTextColor(...c);
  const setFill = (c: [number, number, number]) => doc.setFillColor(...c);

  // ── Load logo ──
  let logo: string | null = null;
  if (provider.avatar_url) logo = await loadLogoAsBase64(provider.avatar_url);

  // ══════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════
  const companyName = provider.invoice_company_name || provider.company_name || provider.display_name || "Provider";

  if (logo) {
    try { doc.addImage(logo, "PNG", M, y, 18, 18); } catch { /* ignore */ }
  }

  const hx = logo ? M + 22 : M;

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setColor(C.black);
  doc.text(companyName, hx, y + 5);

  // Contact info — single line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(C.dark);
  const infoParts: string[] = [];
  if (provider.email) infoParts.push(provider.email);
  if (provider.phone) infoParts.push(provider.phone);
  if (infoParts.length) doc.text(infoParts.join("  |  "), hx, y + 10);

  // Address
  if (provider.invoice_address) {
    const addrLines = provider.invoice_address.split("\n").map((l: string) => l.trim()).filter(Boolean);
    doc.text(addrLines.join(", "), hx, y + 14);
  }

  // Tax ID
  if (provider.invoice_tax_id) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(C.mid);
    doc.text(`Tax ID: ${provider.invoice_tax_id}`, hx, y + 18);
  }

  y += 26;

  // ── Blue accent line ──
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(1.2);
  doc.line(M, y, RX, y);
  y += 10;

  // ══════════════════════════════════════
  // INVOICE TITLE + DATE
  // ══════════════════════════════════════
  const prefix = provider.invoice_prefix || "INV";
  const num = String(provider.invoice_next_number || 1).padStart(4, "0");
  const invoiceNumber = `${prefix}-${num}`;
  const invoiceDate = new Date().toLocaleDateString("en-GB");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(C.blue);
  doc.text("INVOICE", M, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColor(C.dark);
  doc.text(invoiceNumber, M + 50, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(C.mid);
  doc.text(`Date: ${invoiceDate}`, RX, y, { align: "right" });
  y += 12;

  // ══════════════════════════════════════
  // BILL TO
  // ══════════════════════════════════════
  setFill(C.bg);
  doc.roundedRect(M, y, W, 22, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(C.mid);
  doc.text("BILL TO", M + 5, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(C.black);
  doc.text(booking.booker_name || "Client", M + 5, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(C.dark);
  const clientInfo: string[] = [];
  if (booking.booker_email) clientInfo.push(booking.booker_email);
  if (booking.booker_phone) clientInfo.push(booking.booker_phone);
  doc.text(clientInfo.join("  •  "), M + 5, y + 16);

  y += 28;

  // ══════════════════════════════════════
  // TABLE
  // ══════════════════════════════════════
  // Table header
  setFill(C.blue);
  doc.rect(M, y, W, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(C.white);
  const colDesc = M + 4;
  const colQty = M + 105;
  const colUnit = M + 125;
  const colTotal = RX - 4;
  doc.text("DESCRIPTION", colDesc, y + 5.5);
  doc.text("QTY", colQty, y + 5.5);
  doc.text("UNIT PRICE", colUnit, y + 5.5);
  doc.text("TOTAL", colTotal, y + 5.5, { align: "right" });
  y += 10;

  // Table row
  const title = service?.title || "Service";
  const dateInfo = booking.date_from && booking.date_to
    ? `${booking.date_from} → ${booking.date_to}`
    : booking.service_date || "";
  const qty = booking.quantity || 1;
  const subtotalPrice = Number(booking.total_price || 0);
  const unitPrice = service?.price || subtotalPrice / qty;
  const currency = booking.currency || "EUR";

  // Alternating row bg
  setFill(C.bg);
  doc.rect(M, y - 1, W, dateInfo ? 12 : 8, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(C.black);
  doc.text(title, colDesc, y + 4);

  if (dateInfo) {
    doc.setFontSize(7);
    setColor(C.mid);
    doc.text(dateInfo, colDesc, y + 9);
  }

  doc.setFontSize(9);
  setColor(C.dark);
  doc.text(String(qty), colQty, y + 4);
  doc.text(`${unitPrice.toLocaleString()} ${currency}`, colUnit, y + 4);
  doc.setFont("helvetica", "bold");
  setColor(C.black);
  doc.text(`${subtotalPrice.toLocaleString()} ${currency}`, colTotal, y + 4, { align: "right" });

  y += dateInfo ? 14 : 10;

  // Separator
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.2);
  doc.line(M, y, RX, y);
  y += 4;

  // ══════════════════════════════════════
  // TAX + TOTALS
  // ══════════════════════════════════════
  const taxRate = Number(provider.tax_rate || 0);
  const taxLabel = provider.tax_label || "VAT";
  const taxAmount = taxRate > 0 ? Math.round(subtotalPrice * taxRate) / 100 : 0;
  const grandTotal = subtotalPrice + taxAmount;

  const totalsX = M + 100;
  const totalsValX = RX - 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(C.dark);

  // Subtotal
  doc.text("Subtotal", totalsX, y + 4);
  doc.text(`${subtotalPrice.toLocaleString()} ${currency}`, totalsValX, y + 4, { align: "right" });
  y += 6;

  // Tax
  if (taxRate > 0) {
    doc.text(`${taxLabel} (${taxRate}%)`, totalsX, y + 4);
    doc.text(`${taxAmount.toLocaleString()} ${currency}`, totalsValX, y + 4, { align: "right" });
    y += 6;
  }

  // Grand Total
  y += 2;
  setFill(C.blueBg);
  doc.roundedRect(totalsX - 4, y - 1, RX - totalsX + 8, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(C.blue);
  doc.text("TOTAL", totalsX, y + 7);
  doc.text(`${grandTotal.toLocaleString()} ${currency}`, totalsValX, y + 7, { align: "right" });
  y += 18;

  // ══════════════════════════════════════
  // PAYMENT STATUS
  // ══════════════════════════════════════
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(C.dark);
  const paidStatus = booking.payment_confirmed ? "PAID" : "PENDING";
  doc.text(`Payment Status: ${paidStatus}`, M, y);
  if (booking.payment_confirmed_at) {
    doc.text(`  •  Paid on: ${new Date(booking.payment_confirmed_at).toLocaleDateString("en-GB")}`, M + 55, y);
  }
  y += 6;

  // Notes
  if (booking.notes) {
    doc.setFontSize(8);
    setColor(C.mid);
    doc.text(`Notes: ${booking.notes}`, M, y);
    y += 6;
  }

  // ══════════════════════════════════════
  // BANK DETAILS
  // ══════════════════════════════════════
  if (provider.bank_iban || provider.bank_bic) {
    y += 4;
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.3);
    doc.line(M, y, RX, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(C.blue);
    doc.text("BANK DETAILS FOR WIRE TRANSFER", M, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(C.dark);
    const bankLines: string[] = [];
    if (provider.bank_holder) bankLines.push(`Holder: ${provider.bank_holder}`);
    if (provider.bank_iban) bankLines.push(`IBAN: ${provider.bank_iban}`);
    if (provider.bank_bic) bankLines.push(`BIC: ${provider.bank_bic}`);
    if (provider.bank_name) bankLines.push(`Bank: ${provider.bank_name}`);
    bankLines.forEach(line => {
      doc.text(line, M, y);
      y += 4;
    });
  }

  // ══════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.2);
  doc.line(M, 272, RX, 272);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(C.light);
  doc.text(`Generated by Easy-Locs\u00AE  —  ${invoiceNumber}`, M, 277);
  doc.text(invoiceDate, RX, 277, { align: "right" });

  // Save
  const fileName = `${invoiceNumber}-${(booking.booker_name || "invoice").replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
  toast.success(`Invoice ${invoiceNumber} generated!`);

  return doc.output("blob");
}

export function getInvoiceNumber(provider: any): string {
  const prefix = provider?.invoice_prefix || "INV";
  const num = String(provider?.invoice_next_number || 1).padStart(4, "0");
  return `${prefix}-${num}`;
}
