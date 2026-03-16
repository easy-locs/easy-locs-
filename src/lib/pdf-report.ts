/**
 * pdf-report — PDF financial report generator
 * PASS55 Block O: Reporting / Export
 */
import jsPDF from "jspdf";

export interface ReportSummary {
  title: string;
  period: string;
  orgName?: string;
  generatedAt: string;
  currency: string;
  totalRevenue: number;
  totalCollected: number;
  totalUnpaid: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  properties: PropertyReportRow[];
  expensesByCategory: { category: string; amount: number }[];
  monthlyBreakdown: { month: string; collected: number; expenses: number }[];
}

export interface PropertyReportRow {
  label: string;
  country: string;
  revenue: number;
  collected: number;
  expenses: number;
  net: number;
}

export function generateFinancialPDF(report: ReportSummary): jsPDF {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: report.currency }).format(n);

  // Header
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("EASY-LOCS®", 14, 18);
  doc.setFontSize(11);
  doc.text(report.title, 14, 28);
  doc.setFontSize(8);
  doc.text(`${report.period} • ${report.generatedAt}`, 14, 35);
  if (report.orgName) {
    doc.text(report.orgName, pageW - 14, 28, { align: "right" });
  }

  y = 50;
  doc.setTextColor(30, 30, 30);

  // KPI Section
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Résumé financier", 14, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const kpis = [
    ["Revenus attendus", fmt(report.totalRevenue)],
    ["Encaissé", fmt(report.totalCollected)],
    ["Impayés", fmt(report.totalUnpaid)],
    ["Dépenses", fmt(report.totalExpenses)],
    ["Résultat net", fmt(report.netIncome)],
    ["Taux d'encaissement", `${report.collectionRate.toFixed(1)}%`],
  ];

  const colW = (pageW - 28) / 3;
  kpis.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * colW;
    const ky = y + row * 16;

    doc.setFillColor(245, 245, 250);
    doc.roundedRect(x, ky - 4, colW - 4, 14, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    doc.text(label, x + 3, ky + 1);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 3, ky + 8);
    doc.setFont("helvetica", "normal");
  });

  y += Math.ceil(kpis.length / 3) * 16 + 10;

  // Properties table
  if (report.properties.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Détail par bien", 14, y);
    y += 8;

    // Table headers
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 120);
    const cols = [14, 70, 100, 130, 155, 180];
    ["Bien", "Pays", "Revenus", "Encaissé", "Dépenses", "Net"].forEach((h, i) => {
      doc.text(h, cols[i], y);
    });
    y += 2;
    doc.setDrawColor(200, 200, 210);
    doc.line(14, y, pageW - 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8);

    report.properties.forEach((p) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(p.label.slice(0, 30), cols[0], y);
      doc.text(p.country, cols[1], y);
      doc.text(fmt(p.revenue), cols[2], y);
      doc.text(fmt(p.collected), cols[3], y);
      doc.text(fmt(p.expenses), cols[4], y);
      const netColor = p.net >= 0 ? [34, 139, 34] : [200, 50, 50];
      doc.setTextColor(netColor[0], netColor[1], netColor[2]);
      doc.text(fmt(p.net), cols[5], y);
      doc.setTextColor(30, 30, 30);
      y += 7;
    });

    y += 5;
  }

  // Expenses by category
  if (report.expensesByCategory.length > 0 && y < 240) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Répartition des dépenses", 14, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    report.expensesByCategory.forEach((cat) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const barMaxW = 80;
      const maxAmt = Math.max(...report.expensesByCategory.map(c => c.amount));
      const barW = maxAmt > 0 ? (cat.amount / maxAmt) * barMaxW : 0;

      doc.text(cat.category, 14, y);
      doc.setFillColor(212, 168, 83);
      doc.roundedRect(70, y - 3, barW, 4, 1, 1, "F");
      doc.text(fmt(cat.amount), 155, y);
      y += 7;
    });
    y += 5;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Généré par Easy-Locs® — Ce document est un récapitulatif et ne constitue pas un document comptable officiel.", 14, footerY);
  doc.text(`Page 1/${doc.getNumberOfPages()}`, pageW - 14, footerY, { align: "right" });

  return doc;
}

export function downloadFinancialPDF(report: ReportSummary) {
  const doc = generateFinancialPDF(report);
  doc.save(`easy-locs-rapport-${report.period.replace(/\s/g, "-")}.pdf`);
}
