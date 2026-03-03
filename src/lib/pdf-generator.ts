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

// ====== COUNTRY-AWARE LOCALE MAPS ======
const COUNTRY_LOCALE: Record<string, string> = {
  FR: "fr-FR", BE: "fr-BE", ES: "es-ES", IT: "it-IT", DE: "de-DE",
  PT: "pt-PT", NL: "nl-NL", GB: "en-GB", CH: "fr-CH", AT: "de-AT", LU: "fr-LU",
  PL: "pl-PL", SE: "sv-SE", DK: "da-DK", NO: "nb-NO", FI: "fi-FI",
  GR: "el-GR", CZ: "cs-CZ", HU: "hu-HU", RO: "ro-RO", HR: "hr-HR",
  IE: "en-IE", BG: "bg-BG", SK: "sk-SK",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  FR: "EUR", BE: "EUR", ES: "EUR", IT: "EUR", DE: "EUR", PT: "EUR",
  NL: "EUR", AT: "EUR", LU: "EUR", FI: "EUR", GR: "EUR", IE: "EUR",
  SK: "EUR", HR: "EUR", BG: "BGN", CH: "CHF", GB: "GBP",
  PL: "PLN", SE: "SEK", DK: "DKK", NO: "NOK", CZ: "CZK", HU: "HUF", RO: "RON",
};

const PDF_LABELS: Record<string, { legalBasis: string; signedIn: string; madeDate: string; landlordLabel: string; tenantLabel: string; copies: string; disclaimer: string }> = {
  fr: { legalBasis: "Base légale", signedIn: "Fait à", madeDate: "le", landlordLabel: "Le bailleur / L'expéditeur", tenantLabel: "Le locataire / Le destinataire", copies: "Fait en deux exemplaires originaux.", disclaimer: "Document généré à titre informatif. Il ne remplace pas un conseil juridique." },
  en: { legalBasis: "Legal basis", signedIn: "Signed in", madeDate: "on", landlordLabel: "The landlord / Sender", tenantLabel: "The tenant / Recipient", copies: "Made in two original copies.", disclaimer: "Document generated for informational purposes. It does not replace legal advice." },
  es: { legalBasis: "Base legal", signedIn: "Firmado en", madeDate: "el", landlordLabel: "El arrendador / Remitente", tenantLabel: "El inquilino / Destinatario", copies: "Hecho en dos ejemplares originales.", disclaimer: "Documento generado con fines informativos. No sustituye el asesoramiento jurídico." },
  de: { legalBasis: "Rechtsgrundlage", signedIn: "Erstellt in", madeDate: "am", landlordLabel: "Der Vermieter / Absender", tenantLabel: "Der Mieter / Empfänger", copies: "Erstellt in zwei Originalausfertigungen.", disclaimer: "Dokument zu Informationszwecken erstellt. Es ersetzt keine Rechtsberatung." },
  it: { legalBasis: "Base giuridica", signedIn: "Fatto a", madeDate: "il", landlordLabel: "Il locatore / Mittente", tenantLabel: "Il conduttore / Destinatario", copies: "Fatto in due copie originali.", disclaimer: "Documento generato a scopo informativo. Non sostituisce la consulenza legale." },
  pt: { legalBasis: "Base legal", signedIn: "Feito em", madeDate: "em", landlordLabel: "O senhorio / Remetente", tenantLabel: "O inquilino / Destinatário", copies: "Feito em dois exemplares originais.", disclaimer: "Documento gerado para fins informativos. Não substitui aconselhamento jurídico." },
};

const COUNTRY_LANG: Record<string, string> = {
  FR: "fr", BE: "fr", ES: "es", IT: "it", DE: "de", PT: "pt",
  NL: "en", GB: "en", CH: "fr", AT: "de", LU: "fr",
  PL: "en", SE: "en", DK: "en", NO: "en", FI: "en",
  GR: "en", CZ: "en", HU: "en", RO: "en", HR: "en",
  IE: "en", BG: "en", SK: "en",
};

function getLang(country?: string): string {
  return COUNTRY_LANG[country || "FR"] || "en";
}

function getPdfLabels(country?: string) {
  const lang = getLang(country);
  return PDF_LABELS[lang] || PDF_LABELS.en;
}

/** Sanitize text: normalize unicode, replace smart quotes & special chars for jsPDF Helvetica compatibility */
function sanitize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    .replace(/\t/g, "    ")
    // Box-drawing characters -> ASCII
    .replace(/[\u2550\u2551\u2554\u2557\u255A\u255D\u2500\u2502\u250C\u2510\u2514\u2518\u2552\u2555\u2558\u255B\u2553\u2556\u2559\u255C\u255E\u2561\u255F\u2562\u256A\u256B\u256C]/g, "-")
    .replace(/[\u2022\u2023\u25E6\u25AA\u25AB\u2043\u2219]/g, "-") // bullets
    .replace(/\u00B0/g, "deg") // degree
    .replace(/\u00B2/g, "2") // superscript 2 (m²)
    .replace(/\u20AC/g, "EUR") // euro sign
    .replace(/\u00A3/g, "GBP") // pound sign
    // Replace accented characters that Helvetica can't render
    .replace(/[\u00E0\u00E2\u00E4]/g, "a")
    .replace(/[\u00E9\u00E8\u00EA\u00EB]/g, "e")
    .replace(/[\u00EE\u00EF]/g, "i")
    .replace(/[\u00F4\u00F6]/g, "o")
    .replace(/[\u00F9\u00FB\u00FC]/g, "u")
    .replace(/\u00E7/g, "c")
    .replace(/[\u00C0\u00C2\u00C4]/g, "A")
    .replace(/[\u00C9\u00C8\u00CA\u00CB]/g, "E")
    .replace(/[\u00CE\u00CF]/g, "I")
    .replace(/[\u00D4\u00D6]/g, "O")
    .replace(/[\u00D9\u00DB\u00DC]/g, "U")
    .replace(/\u00C7/g, "C")
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "OE")
    // Remove any remaining non-ASCII that Helvetica can't handle
    .replace(/[^\x00-\x7F]/g, "");
}

function formatDateLocalized(dateStr: string, country?: string): string {
  if (!dateStr) return "";
  const locale = COUNTRY_LOCALE[country || "FR"] || "en-GB";
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrencyLocalized(amount: number, country?: string): string {
  const locale = COUNTRY_LOCALE[country || "FR"] || "en-GB";
  const currency = COUNTRY_CURRENCY[country || "FR"] || "EUR";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function interpolate(text: string, data: Record<string, unknown>, country?: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const val = data[key];
    if (val === undefined || val === null || val === "") return "";
    const isAmountKey = key.toLowerCase().includes("amount") || key === "total" || key === "capital" || key === "depositAmount";
    if (typeof val === "number" && isAmountKey) {
      return formatCurrencyLocalized(Number(val), country);
    }
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return formatDateLocalized(val, country);
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
  doc.text("Easy-Locs", MARGIN, 22);

  setFont(doc, "normal", FONT_BODY, COLOR_MUTED);
  const titleClean = sanitize(title);
  doc.text(titleClean, MARGIN, 30);

  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 34, PAGE_WIDTH - MARGIN, 34);
  return 42;
}

function addFooter(doc: jsPDF, country?: string) {
  const labels = getPdfLabels(country);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setFont(doc, "italic", 7, COLOR_MUTED);
    doc.text(
      sanitize(labels.disclaimer),
      MARGIN, 283
    );
    // EASY-LOCS® branding
    setFont(doc, "bold", 8, COLOR_PRIMARY);
    doc.text("EASY-LOCS", PAGE_WIDTH / 2 - 8, 289);
    setFont(doc, "normal", 5, COLOR_PRIMARY);
    doc.text("\u00AE", PAGE_WIDTH / 2 + 11, 286.5);
    // Page number
    setFont(doc, "normal", 7, COLOR_MUTED);
    doc.text(`Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 289, { align: "right" });
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(0, 291, PAGE_WIDTH, 6, "F");
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
  options?: { skipTenantSignature?: boolean; country?: string }
): jsPDF {
  const country = options?.country || template.country || "FR";
  const labels = getPdfLabels(country);
  const locale = COUNTRY_LOCALE[country] || "en-GB";
  const doc = new jsPDF();
  let y = addHeader(doc, template.label.toUpperCase());

  // Legal basis
  if (template.legalBasis) {
    setFont(doc, "italic", 8, COLOR_MUTED);
    doc.text(sanitize(`${labels.legalBasis} : ${template.legalBasis}`), MARGIN, y);
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
    const resolved = interpolate(clause.text, enrichedData, country);
    y = addParagraph(doc, resolved, y);
    y += 2;
  }

  // Signature block
  y += 8;
  y = checkPageBreak(doc, y, 55);
  y = addParagraph(doc, labels.copies, y);

  setFont(doc, "normal", FONT_BODY, COLOR_BODY);
  const todayStr = new Date().toLocaleDateString(locale);
  doc.text(sanitize(`${labels.signedIn} ________________, ${labels.madeDate} ${todayStr}`), MARGIN, y);
  y += 14;

  // Dual signature columns
  const colWidth = CONTENT_WIDTH / 2 - 5;
  const sigStartY = y;

  // Landlord / Sender column
  setFont(doc, "bold", FONT_LABEL, COLOR_MUTED);
  doc.text(labels.landlordLabel, MARGIN, sigStartY);
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
    doc.text(labels.tenantLabel, col2X, sigStartY);
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

  addFooter(doc, country);
  return doc;
}

// Utility exports

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function pdfToDataUri(doc: jsPDF): string {
  return doc.output("datauristring");
}
