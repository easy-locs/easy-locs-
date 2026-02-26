import jsPDF from "jspdf";
import type { DocumentTemplate } from "./templates/types";

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 5.5;
const FONT_BODY = 10;
const FONT_LABEL = 8.5;
const FONT_SECTION = 12;
const FONT_TITLE = 16;
const COLOR_PRIMARY: [number, number, number] = [26, 39, 68];
const COLOR_GOLD: [number, number, number] = [212, 163, 74];
const COLOR_BODY: [number, number, number] = [40, 40, 40];
const COLOR_MUTED: [number, number, number] = [110, 110, 110];

/** Sanitize text: normalize unicode, replace smart quotes & special chars */
function sanitize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    .replace(/\t/g, "    ");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

function interpolate(text: string, data: Record<string, unknown>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const val = data[key];
    if (val === undefined || val === null) return `{${key}}`;
    if (typeof val === "number" && key.toLowerCase().includes("amount") || key === "total" || key === "capital" || key === "depositAmount") {
      return formatCurrency(Number(val));
    }
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return formatDate(val);
    }
    return String(val);
  });
}

function setFont(doc: jsPDF, style: "normal" | "bold" | "italic", size: number, color: [number, number, number]) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 275) { doc.addPage(); return 25; }
  return y;
}

function addHeader(doc: jsPDF, title: string): number {
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 0, PAGE_WIDTH, 8, "F");

  setFont(doc, "bold", FONT_TITLE, COLOR_PRIMARY);
  doc.text("Easyloc", MARGIN, 22);

  setFont(doc, "normal", FONT_BODY, COLOR_MUTED);
  const titleClean = sanitize(title);
  doc.text(titleClean, MARGIN, 30);

  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 34, PAGE_WIDTH - MARGIN, 34);
  return 42;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setFont(doc, "italic", 7, COLOR_MUTED);
    doc.text(
      sanitize("Ce document est genere a titre informatif. Il ne remplace pas les conseils d'un avocat, notaire ou expert-comptable."),
      MARGIN, 287
    );
    setFont(doc, "normal", 7, COLOR_MUTED);
    doc.text(`Easyloc - Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 287, { align: "right" });
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(0, 290, PAGE_WIDTH, 7, "F");
  }
}

function addSection(doc: jsPDF, title: string, y: number): number {
  y = checkPageBreak(doc, y, 20);
  setFont(doc, "bold", FONT_SECTION, COLOR_PRIMARY);
  doc.text(sanitize(title), MARGIN, y);
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 2, MARGIN + 40, y + 2);
  return y + 9;
}

function addField(doc: jsPDF, label: string, value: string, y: number): number {
  y = checkPageBreak(doc, y, 16);
  setFont(doc, "bold", FONT_LABEL, COLOR_MUTED);
  doc.text(sanitize(label), MARGIN, y);
  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  doc.text(sanitize(value || "\u2014"), MARGIN, y + 5);
  return y + 14;
}

function addParagraph(doc: jsPDF, text: string, y: number): number {
  y = checkPageBreak(doc, y, 15);
  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  const cleanText = sanitize(text);
  const lines: string[] = doc.splitTextToSize(cleanText, CONTENT_WIDTH);
  for (const line of lines) {
    y = checkPageBreak(doc, y, LINE_HEIGHT + 2);
    doc.text(line, MARGIN, y);
    y += LINE_HEIGHT;
  }
  return y + 3;
}

// ====== UNIVERSAL TEMPLATE-BASED GENERATOR ======
export function generateFromTemplate(
  template: DocumentTemplate,
  data: Record<string, unknown>,
  signatures?: { landlord?: string; tenant?: string },
  stamp?: string,
  options?: { skipTenantSignature?: boolean }
): jsPDF {
  const doc = new jsPDF();
  let y = addHeader(doc, template.label.toUpperCase());

  // Legal basis
  if (template.legalBasis) {
    setFont(doc, "italic", 8, COLOR_MUTED);
    doc.text(sanitize(`Base legale : ${template.legalBasis}`), MARGIN, y);
    y += 9;
  }

  // Compute total for rental docs
  const enrichedData = { ...data };
  if (data.rentAmount !== undefined && data.chargesAmount !== undefined) {
    enrichedData.total = Number(data.rentAmount) + Number(data.chargesAmount);
  }

  // Render clauses
  for (const clause of template.clauses) {
    if (clause.conditional && !clause.conditional(enrichedData)) continue;
    y = addSection(doc, clause.label, y);
    const resolved = interpolate(clause.text, enrichedData);
    y = addParagraph(doc, resolved, y);
    y += 2;
  }

  // Signature block
  y += 8;
  y = checkPageBreak(doc, y, 55);
  y = addParagraph(doc, "Fait en deux exemplaires originaux.", y);

  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  doc.text(sanitize(`Fait a ________________, le ${new Date().toLocaleDateString("fr-FR")}`), MARGIN, y);
  y += 14;

  // Dual signature columns
  const colWidth = CONTENT_WIDTH / 2 - 5;
  const sigStartY = y;

  // Landlord / Sender column
  setFont(doc, "bold", FONT_LABEL, COLOR_MUTED);
  doc.text("Le bailleur / L'expediteur", MARGIN, sigStartY);
  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  const landlordName = sanitize(String(data.landlordName || data.senderName || data.hostName || data.presidentName || data.gerantName || ""));
  if (landlordName) doc.text(landlordName, MARGIN, sigStartY + 6);

  if (signatures?.landlord) {
    try {
      doc.addImage(signatures.landlord, "PNG", MARGIN, sigStartY + 10, colWidth, 25);
    } catch { /* ignore invalid image */ }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(MARGIN, sigStartY + 10, colWidth, 25);
    doc.setLineDashPattern([], 0);
  }

  // Company stamp (tampon) next to landlord signature
  if (stamp) {
    try {
      doc.addImage(stamp, "PNG", MARGIN + colWidth - 28, sigStartY + 8, 26, 26);
    } catch { /* ignore invalid stamp image */ }
  }

  // Tenant / Recipient column (only if not skipped)
  if (!options?.skipTenantSignature) {
    const col2X = MARGIN + colWidth + 10;
    setFont(doc, "bold", FONT_LABEL, COLOR_MUTED);
    doc.text("Le locataire / Le destinataire", col2X, sigStartY);
    setFont(doc, "normal", FONT_BODY, COLOR_BODY);
    const tenantName = sanitize(String(data.tenantName || data.recipientName || data.guestName || data.guarantorName || ""));
    if (tenantName) doc.text(tenantName, col2X, sigStartY + 6);

    if (signatures?.tenant) {
      try {
        doc.addImage(signatures.tenant, "PNG", col2X, sigStartY + 10, colWidth, 25);
      } catch { /* ignore invalid image */ }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(col2X, sigStartY + 10, colWidth, 25);
      doc.setLineDashPattern([], 0);
    }
  }

  addFooter(doc);
  return doc;
}

// Utility exports

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function pdfToDataUri(doc: jsPDF): string {
  return doc.output("datauristring");
}
