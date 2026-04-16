export interface OcrExtraction {
  fullText: string;
  fields: OcrField[];
  confidence: number;
  documentType: "id_card" | "passport" | "drivers_license" | "unknown";
}

export interface OcrField {
  key: string;
  label: string;
  value: string;
  confidence: number;
}

interface FieldPattern {
  key: string;
  label: string;
  patterns: RegExp[];
}

const BOUNDARY_LOOKAHEAD =
  "(?=\\s+(?:nombre|surname|family|name|isim|nome|nom|d\\.?o\\.?b|birth|born|date|naissance|no|number|num|id|document|expir|valid|exp|nationality|nationalit|ciudadania|sex|gender|sexe)\\b|\\s*\\d|\\s*$)";

function boundedPattern(label: string, capture: string): RegExp {
  return new RegExp(`(?:${label})\\b\\s*[:\\-]?\\s*${capture}${BOUNDARY_LOOKAHEAD}`, "i");
}

const FIELD_PATTERNS: FieldPattern[] = [
  {
    key: "full_name",
    label: "Full Name",
    patterns: [
      boundedPattern("nombre|name|isim|nome|nom", "([A-Z][a-zA-Z\\-']+(?:\\s+[a-zA-Z\\-']+)*?)"),
      boundedPattern("surname|family", "([A-Z][a-zA-Z\\-']+(?:\\s+[a-zA-Z\\-']+)*?)"),
    ],
  },
  {
    key: "date_of_birth",
    label: "Date of Birth",
    patterns: [
      /(?:d[.\s]?o[.\s]?b|birth|born|date.?of.?birth|naissance)\s*[:\-]?\s*(\d{1,2}[\\/\-\.]\d{1,2}[\\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\\/\-\.]\d{1,2}[\\/\-\.]\d{4})/,
    ],
  },
  {
    key: "document_number",
    label: "Document Number",
    patterns: [
      /(?:no|number|num|id|document)\s*[:\-]?\s*([A-Z0-9]{6,15})/i,
      /([A-Z]{1,3}\d{6,9})/,
    ],
  },
  {
    key: "expiry_date",
    label: "Expiry Date",
    patterns: [
      /(?:expir|valid|exp)\s*[:\-]?\s*(\d{1,2}[\\/\-\.]\d{1,2}[\\/\-\.]\d{2,4})/i,
    ],
  },
  {
    key: "nationality",
    label: "Nationality",
    patterns: [
      boundedPattern("nationality|nationalite|ciudadania", "([A-Z][a-zA-Z\\-']+(?:\\s+[a-zA-Z\\-']+)*?)"),
    ],
  },
  {
    key: "gender",
    label: "Gender",
    patterns: [
      /(?:sex|gender|sexe)\s*[:\-]?\s*(M|F|MALE|FEMALE|MASCULIN|FEMININ)/i,
    ],
  },
];

function detectDocumentType(text: string): OcrExtraction["documentType"] {
  const lower = text.toLowerCase();
  if (lower.includes("passport") || lower.includes("passeport") || lower.includes("pasaporte")) {
    return "passport";
  }
  if (lower.includes("driver") || lower.includes("driving") || lower.includes("permis") || lower.includes("licencia")) {
    return "drivers_license";
  }
  if (lower.includes("identity") || lower.includes("identit") || lower.includes("national id") || lower.includes("carte")) {
    return "id_card";
  }
  return "unknown";
}

function extractFields(text: string): OcrField[] {
  const fields: OcrField[] = [];
  const lines = text.split("\n");
  const fullText = lines.join(" ");

  for (const pattern of FIELD_PATTERNS) {
    let matched = false;
    for (const regex of pattern.patterns) {
      const match = fullText.match(regex);
      if (match?.[1]) {
        const value = match[1].trim();
        const confidence = value.length > 2 ? 0.85 : 0.5;
        fields.push({
          key: pattern.key,
          label: pattern.label,
          value,
          confidence,
        });
        matched = true;
        break;
      }
    }
    if (!matched) {
      const heuristic = tryHeuristicExtraction(pattern.key, lines);
      if (heuristic) {
        fields.push({
          key: pattern.key,
          label: pattern.label,
          value: heuristic,
          confidence: 0.4,
        });
      }
    }
  }

  return fields;
}

function tryHeuristicExtraction(key: string, lines: string[]): string | null {
  if (key === "full_name") {
    const nameLine = lines.find(
      (l) => /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(l.trim()) && l.trim().length < 60,
    );
    return nameLine?.trim() ?? null;
  }
  if (key === "date_of_birth" || key === "expiry_date") {
    for (const line of lines) {
      const dateMatch = line.match(/(\d{1,2}[\\/\-\.]\d{1,2}[\\/\-\.]\d{2,4})/);
      if (dateMatch) return dateMatch[1];
    }
  }
  if (key === "document_number") {
    for (const line of lines) {
      const numMatch = line.match(/([A-Z]{1,3}\d{5,10})/);
      if (numMatch) return numMatch[1];
    }
  }
  return null;
}

export function processOcrText(rawText: string): OcrExtraction {
  const fields = extractFields(rawText);
  const documentType = detectDocumentType(rawText);

  const avgConfidence =
    fields.length > 0
      ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
      : 0;

  return {
    fullText: rawText,
    fields,
    confidence: Math.round(avgConfidence * 100) / 100,
    documentType,
  };
}

export async function processImageWithTesseract(
  imageData: string | Blob,
): Promise<OcrExtraction> {
  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng");
    const result = await worker.recognize(imageData);
    await worker.terminate();
    return processOcrText(result.data.text || "");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OCR processing failed";
    throw new Error(`Document scanning failed: ${message}. Please try again with a clearer image.`);
  }
}
