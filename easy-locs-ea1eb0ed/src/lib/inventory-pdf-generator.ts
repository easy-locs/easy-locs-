import type jsPDF from "jspdf";

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 5.5;
const COLOR_PRIMARY: [number, number, number] = [26, 39, 68];
const COLOR_GOLD: [number, number, number] = [212, 163, 74];
const COLOR_BODY: [number, number, number] = [40, 40, 40];
const COLOR_MUTED: [number, number, number] = [110, 110, 110];

const conditionMap: Record<string, { label: string; color: [number, number, number] }> = {
  good: { label: "Bon etat", color: [22, 163, 74] },
  average: { label: "Moyen", color: [202, 138, 4] },
  bad: { label: "Mauvais", color: [220, 38, 38] },
};

interface InventoryRoom {
  room_name: string;
  items: {
    element_name: string;
    condition: string;
    notes: string;
    photo_urls: string[];
  }[];
}

interface InventoryData {
  propertyLabel: string;
  reportType: "entry" | "exit";
  reportDate: string;
  tenantName?: string;
  keysCount: number;
  keysDetails: string;
  meterElectricity: string;
  meterGas: string;
  meterWater: string;
  generalNotes: string;
  rooms: InventoryRoom[];
}

function sanitize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
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
    .replace(/\u00B2/g, "2")
    .replace(/\u00B0/g, "deg")
    .replace(/\u20AC/g, "EUR")
    .replace(/[^\x00-\x7F]/g, "");
}

function setFont(doc: jsPDF, style: "normal" | "bold" | "italic", size: number, color: [number, number, number]) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
}

function addContinuationHeader(doc: jsPDF) {
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 3, PAGE_WIDTH, 1.5, "F");
  setFont(doc, "bold", 8, COLOR_PRIMARY);
  doc.text("EASY-LOCS", MARGIN, 12);
  setFont(doc, "normal", 4, COLOR_PRIMARY);
  doc.text("(R)", MARGIN + doc.getTextWidth("EASY-LOCS") + 1, 9.5);
  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 15, PAGE_WIDTH - MARGIN, 15);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 268) {
    doc.addPage();
    addContinuationHeader(doc);
    return 22;
  }
  return y;
}

/** Load image from URL and return base64 data URI */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInventoryPDF(
  data: InventoryData,
  signatures?: { landlord?: string; tenant?: string },
  stamp?: string
): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const typeLabel = data.reportType === "entry" ? "Etat des lieux d'entree" : "Etat des lieux de sortie";

  // Header — premium styling
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(0, 0, PAGE_WIDTH, 7, "F");
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 7, PAGE_WIDTH, 1.5, "F");

  setFont(doc, "bold", 16, COLOR_PRIMARY);
  doc.text("EASY-LOCS", MARGIN, 20);
  setFont(doc, "normal", 6, COLOR_PRIMARY);
  doc.text("(R)", MARGIN + doc.getTextWidth("EASY-LOCS") + 1, 17);

  // Title with background
  doc.setFillColor(245, 247, 250);
  doc.rect(MARGIN, 25, CONTENT_WIDTH, 10, "F");
  setFont(doc, "bold", 11, COLOR_PRIMARY);
  doc.text(sanitize(typeLabel.toUpperCase()), MARGIN + 3, 31);

  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 36, PAGE_WIDTH - MARGIN, 36);
  let y = 44;

  // Property info
  setFont(doc, "bold", 12, COLOR_PRIMARY);
  doc.text(sanitize(data.propertyLabel), MARGIN, y);
  y += 7;
  setFont(doc, "normal", 10, COLOR_BODY);
  doc.text(sanitize(`Date : ${data.reportDate}`), MARGIN, y);
  y += 6;
  if (data.tenantName) {
    doc.text(sanitize(`Locataire : ${data.tenantName}`), MARGIN, y);
    y += 6;
  }

  // Meters
  y += 4;
  setFont(doc, "bold", 10, COLOR_PRIMARY);
  doc.text("Releves de compteurs", MARGIN, y);
  y += 6;
  setFont(doc, "normal", 9, COLOR_BODY);
  const meters = [
    data.meterElectricity && `Electricite : ${data.meterElectricity} kWh`,
    data.meterGas && `Gaz : ${data.meterGas} m3`,
    data.meterWater && `Eau : ${data.meterWater} m3`,
  ].filter(Boolean);
  for (const m of meters) {
    doc.text(sanitize(m!), MARGIN, y);
    y += 5;
  }

  // Keys
  if (data.keysCount > 0) {
    doc.text(sanitize(`Cles remises : ${data.keysCount} ${data.keysDetails ? `(${data.keysDetails})` : ""}`), MARGIN, y);
    y += 5;
  }

  // General notes
  if (data.generalNotes) {
    y += 3;
    setFont(doc, "italic", 9, COLOR_MUTED);
    const noteLines = doc.splitTextToSize(sanitize(data.generalNotes), CONTENT_WIDTH);
    for (const line of noteLines) {
      y = checkPageBreak(doc, y, 6);
      doc.text(line, MARGIN, y);
      y += 5;
    }
  }

  y += 8;

  // Rooms
  for (const room of data.rooms) {
    y = checkPageBreak(doc, y, 25);

    // Room title with background strip
    doc.setFillColor(245, 247, 250);
    doc.rect(MARGIN, y - 5, CONTENT_WIDTH, 9, "F");
    setFont(doc, "bold", 12, COLOR_PRIMARY);
    doc.text(sanitize(room.room_name), MARGIN + 2, y);
    doc.setDrawColor(...COLOR_GOLD);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y + 4, MARGIN + 45, y + 4);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.15);
    doc.line(MARGIN + 46, y + 4, PAGE_WIDTH - MARGIN, y + 4);
    y += 11;

    for (const item of room.items) {
      y = checkPageBreak(doc, y, 20);

      // Element name + condition badge
      setFont(doc, "bold", 10, COLOR_BODY);
      doc.text(sanitize(item.element_name), MARGIN, y);

      const cond = conditionMap[item.condition] || conditionMap.good;
      setFont(doc, "bold", 8, cond.color);
      doc.text(sanitize(`[${cond.label}]`), MARGIN + 80, y);
      y += 5;

      // Notes
      if (item.notes) {
        setFont(doc, "italic", 8, COLOR_MUTED);
        const noteLines = doc.splitTextToSize(sanitize(item.notes), CONTENT_WIDTH);
        for (const line of noteLines) {
          y = checkPageBreak(doc, y, 5);
          doc.text(line, MARGIN, y);
          y += 4.5;
        }
      }

      // Photos - max 3 per element to avoid PDF bloat
      if (item.photo_urls.length > 0) {
        const photosToRender = item.photo_urls.slice(0, 3);
        // Try to render photos side by side (2 per row)
        for (let pi = 0; pi < photosToRender.length; pi += 2) {
          y = checkPageBreak(doc, y, 38);
          for (let pj = 0; pj < 2 && pi + pj < photosToRender.length; pj++) {
            const photoUrl = photosToRender[pi + pj];
            const xOffset = MARGIN + pj * 55;
            try {
              const base64 = await loadImageAsBase64(photoUrl);
              if (base64) {
                doc.addImage(base64, "JPEG", xOffset, y, 48, 32);
              }
            } catch {
              setFont(doc, "italic", 7, COLOR_MUTED);
              doc.text("[Photo non disponible]", xOffset, y + 5);
            }
          }
          setFont(doc, "italic", 7, COLOR_MUTED);
          doc.text(sanitize(`${item.element_name} - ${room.room_name}`), MARGIN, y + 35);
          y += 40;
        }
      }

      y += 3;
    }
    y += 5;
  }

  // Signature block
  y += 8;
  y = checkPageBreak(doc, y, 55);
  setFont(doc, "normal", 10, COLOR_BODY);
  const todayStr = new Date().toLocaleDateString("fr-FR");
  doc.text(sanitize(`Fait le ${todayStr}`), MARGIN, y);
  y += 10;

  const colWidth = CONTENT_WIDTH / 2 - 5;
  const sigStartY = y;

  // Landlord
  setFont(doc, "bold", 8.5, COLOR_MUTED);
  doc.text("Le bailleur", MARGIN, sigStartY);
  if (signatures?.landlord) {
    try { doc.addImage(signatures.landlord, "PNG", MARGIN, sigStartY + 4, colWidth, 25); } catch {}
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(MARGIN, sigStartY + 4, colWidth, 25);
    doc.setLineDashPattern([], 0);
  }

  if (stamp) {
    try { doc.addImage(stamp, "PNG", MARGIN + colWidth - 28, sigStartY + 2, 26, 26); } catch {}
  }

  // Tenant
  const col2X = MARGIN + colWidth + 10;
  setFont(doc, "bold", 8.5, COLOR_MUTED);
  doc.text("Le locataire", col2X, sigStartY);
  if (signatures?.tenant) {
    try { doc.addImage(signatures.tenant, "PNG", col2X, sigStartY + 4, colWidth, 25); } catch {}
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(col2X, sigStartY + 4, colWidth, 25);
    doc.setLineDashPattern([], 0);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 274, PAGE_WIDTH - MARGIN, 274);
    // Disclaimer
    setFont(doc, "italic", 7, COLOR_MUTED);
    doc.text("Document genere a titre informatif. Il ne remplace pas un conseil juridique.", MARGIN, 279);
    // Brand
    setFont(doc, "bold", 8, COLOR_PRIMARY);
    const brandText = "EASY-LOCS";
    const brandWidth = doc.getTextWidth(brandText);
    const brandX = (PAGE_WIDTH - brandWidth) / 2;
    doc.text(brandText, brandX, 284);
    setFont(doc, "normal", 5, COLOR_PRIMARY);
    doc.text("(R)", brandX + brandWidth + 1, 281.5);
    // Page number
    setFont(doc, "normal", 7, COLOR_MUTED);
    doc.text(`Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 284, { align: "right" });
    // Bottom bars
    doc.setFillColor(...COLOR_GOLD);
    doc.rect(0, 287, PAGE_WIDTH, 2, "F");
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(0, 289, PAGE_WIDTH, 4, "F");
  }

  return doc;
}
