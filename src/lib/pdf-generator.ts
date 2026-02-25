import jsPDF from "jspdf";
import type { DocumentTemplate } from "./templates/types";

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

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

function addHeader(doc: jsPDF, title: string): number {
  doc.setFillColor(212, 163, 74);
  doc.rect(0, 0, PAGE_WIDTH, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 39, 68);
  doc.text("Adminia", MARGIN, 22);
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(title, MARGIN, 30);
  doc.setDrawColor(212, 163, 74);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 34, PAGE_WIDTH - MARGIN, 34);
  return 40;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      "Ce document est généré à titre informatif. Il ne remplace pas les conseils d'un avocat, notaire ou expert-comptable.",
      MARGIN, 287
    );
    doc.text(`Adminia — Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 287, { align: "right" });
    doc.setFillColor(26, 39, 68);
    doc.rect(0, 290, PAGE_WIDTH, 7, "F");
  }
}

function addSection(doc: jsPDF, title: string, y: number): number {
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(26, 39, 68);
  doc.text(title, MARGIN, y);
  return y + 8;
}

function addField(doc: jsPDF, label: string, value: string, y: number): number {
  if (y > 265) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(value || "—", MARGIN, y + 5);
  return y + 13;
}

function addParagraph(doc: jsPDF, text: string, y: number): number {
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 5 + 4;
}

// ====== UNIVERSAL TEMPLATE-BASED GENERATOR ======
export function generateFromTemplate(
  template: DocumentTemplate,
  data: Record<string, unknown>
): jsPDF {
  const doc = new jsPDF();
  let y = addHeader(doc, template.label.toUpperCase());

  // Legal basis
  if (template.legalBasis) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "italic");
    doc.text(`Base légale : ${template.legalBasis}`, MARGIN, y);
    y += 8;
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
  y += 10;
  if (y > 250) { doc.addPage(); y = 20; }
  y = addParagraph(doc, "Fait en deux exemplaires originaux.", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Fait à ________________, le ${new Date().toLocaleDateString("fr-FR")}`, MARGIN, y);
  y += 14;
  doc.text("Signature(s) :", MARGIN, y);

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
