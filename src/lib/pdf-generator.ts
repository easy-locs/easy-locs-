import jsPDF from "jspdf";

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addHeader(doc: jsPDF, title: string) {
  // Gold accent bar
  doc.setFillColor(212, 163, 74); // gold
  doc.rect(0, 0, PAGE_WIDTH, 8, "F");

  // Logo text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 39, 68); // navy
  doc.text("Adminia", MARGIN, 22);

  // Document title
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(title, MARGIN, 30);

  // Separator
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
      MARGIN,
      287
    );
    doc.text(`Adminia — Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 287, { align: "right" });
    // Bottom bar
    doc.setFillColor(26, 39, 68);
    doc.rect(0, 290, PAGE_WIDTH, 7, "F");
  }
}

function addField(doc: jsPDF, label: string, value: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(value, MARGIN, y + 5);
  return y + 13;
}

function addSection(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(26, 39, 68);
  doc.text(title, MARGIN, y);
  return y + 8;
}

function addParagraph(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 5 + 4;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

// ====== RENT RECEIPT ======
export function generateRentReceiptPDF(data: {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  rentAmount: number;
  chargesAmount: number;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
}): jsPDF {
  const doc = new jsPDF();
  let y = addHeader(doc, "QUITTANCE DE LOYER");

  y = addSection(doc, "Bailleur", y);
  y = addField(doc, "Nom", data.landlordName, y);
  y += 4;

  y = addSection(doc, "Locataire", y);
  y = addField(doc, "Nom", data.tenantName, y);
  y = addField(doc, "Adresse du bien", data.propertyAddress, y);
  y += 4;

  y = addSection(doc, "Détails du paiement", y);
  y = addField(doc, "Période", `Du ${formatDate(data.periodStart)} au ${formatDate(data.periodEnd)}`, y);
  y = addField(doc, "Loyer hors charges", formatCurrency(data.rentAmount), y);
  y = addField(doc, "Charges", formatCurrency(data.chargesAmount), y);
  y = addField(doc, "Total reçu", formatCurrency(data.rentAmount + data.chargesAmount), y);
  y = addField(doc, "Date de paiement", formatDate(data.paymentDate), y);
  y += 8;

  y = addParagraph(
    doc,
    `Je soussigné(e) ${data.landlordName}, propriétaire du logement situé au ${data.propertyAddress}, déclare avoir reçu de ${data.tenantName} la somme de ${formatCurrency(data.rentAmount + data.chargesAmount)} au titre du loyer et des charges pour la période du ${formatDate(data.periodStart)} au ${formatDate(data.periodEnd)}.`,
    y
  );

  y = addParagraph(
    doc,
    "Cette quittance annule tous les reçus qui auraient pu être établis précédemment pour la même période. Elle est délivrée sous réserve de tous droits et sans préjudice.",
    y
  );

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Fait à ________________, le ${formatDate(data.paymentDate)}`, MARGIN, y);
  y += 12;
  doc.text("Signature du bailleur :", MARGIN, y);

  addFooter(doc);
  return doc;
}

// ====== LEASE ======
export function generateLeasePDF(data: {
  leaseType: "empty" | "furnished";
  landlordName: string;
  landlordAddress: string;
  tenantName: string;
  propertyAddress: string;
  propertyType: string;
  surface: number;
  rentAmount: number;
  chargesAmount: number;
  depositAmount: number;
  startDate: string;
  duration: number;
}): jsPDF {
  const doc = new jsPDF();
  const typeLabel = data.leaseType === "furnished" ? "MEUBLÉ" : "VIDE";
  let y = addHeader(doc, `CONTRAT DE BAIL D'HABITATION — ${typeLabel}`);

  y = addParagraph(doc, `Conformément à la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs.`, y);
  y += 4;

  y = addSection(doc, "Article 1 — Parties", y);
  y = addField(doc, "Le bailleur", `${data.landlordName}, demeurant au ${data.landlordAddress}`, y);
  y = addField(doc, "Le locataire", data.tenantName, y);
  y += 4;

  y = addSection(doc, "Article 2 — Objet du bail", y);
  y = addField(doc, "Adresse", data.propertyAddress, y);
  y = addField(doc, "Type de bien", data.propertyType, y);
  y = addField(doc, "Surface habitable", `${data.surface} m²`, y);
  y = addField(doc, "Type de location", data.leaseType === "furnished" ? "Meublé" : "Non meublé (vide)", y);
  y += 4;

  y = addSection(doc, "Article 3 — Durée", y);
  y = addParagraph(doc, `Le présent bail est consenti pour une durée de ${data.duration} an(s) à compter du ${formatDate(data.startDate)}.`, y);

  y = addSection(doc, "Article 4 — Loyer et charges", y);
  y = addField(doc, "Loyer mensuel hors charges", formatCurrency(data.rentAmount), y);
  y = addField(doc, "Provisions pour charges", formatCurrency(data.chargesAmount), y);
  y = addField(doc, "Total mensuel", formatCurrency(data.rentAmount + data.chargesAmount), y);
  y += 4;

  y = addSection(doc, "Article 5 — Dépôt de garantie", y);
  y = addParagraph(doc, `Un dépôt de garantie de ${formatCurrency(data.depositAmount)} est versé par le locataire à la signature du bail.`, y);

  y += 8;
  y = addParagraph(doc, "Fait en deux exemplaires originaux,", y);
  doc.text(`À ________________, le ${formatDate(data.startDate)}`, MARGIN, y);
  y += 14;
  doc.text("Le Bailleur                                          Le Locataire", MARGIN, y);

  addFooter(doc);
  return doc;
}

// ====== SWORN STATEMENT ======
export function generateSwornStatementPDF(data: {
  fullName: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  statement: string;
}): jsPDF {
  const doc = new jsPDF();
  let y = addHeader(doc, "ATTESTATION SUR L'HONNEUR");

  y += 6;
  y = addParagraph(doc, `Je soussigné(e) ${data.fullName},`, y);
  y = addField(doc, "Né(e) le", `${formatDate(data.birthDate)} à ${data.birthPlace}`, y);
  y = addField(doc, "Demeurant au", data.address, y);
  y += 8;

  y = addParagraph(doc, "atteste sur l'honneur que :", y);
  y += 2;
  y = addParagraph(doc, data.statement, y);
  y += 8;

  y = addParagraph(
    doc,
    "Je suis informé(e) que toute fausse déclaration de ma part m'expose à des sanctions pénales prévues par l'article 441-7 du Code pénal (un an d'emprisonnement et 15 000 euros d'amende).",
    y
  );

  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Fait pour servir et valoir ce que de droit.`, MARGIN, y);
  y += 10;
  doc.text(`Fait à ________________, le ${new Date().toLocaleDateString("fr-FR")}`, MARGIN, y);
  y += 14;
  doc.text("Signature :", MARGIN, y);

  addFooter(doc);
  return doc;
}

// Download helper
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function pdfToDataUri(doc: jsPDF): string {
  return doc.output("datauristring");
}
