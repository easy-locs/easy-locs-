const ctx = self as unknown as Worker;

interface OCRRequest {
  id: string;
  imageData: ArrayBuffer;
  language?: string;
}

interface OCRField {
  label: string;
  value: string;
  confidence: number;
}

interface OCRResponse {
  id: string;
  success: boolean;
  text?: string;
  fields?: OCRField[];
  confidence?: number;
  error?: string;
}

let tesseractLoaded = false;
let worker: { recognize: (blob: Blob) => Promise<{ data: { text: string; confidence: number } }> } | null = null;

async function initTesseract(language: string = "eng"): Promise<void> {
  if (tesseractLoaded && worker) return;

  try {
    const Tesseract = await import("tesseract.js");
    worker = await Tesseract.createWorker(language, 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
    });
    tesseractLoaded = true;
  } catch (err) {
    throw new Error(`Failed to initialize Tesseract: ${(err as Error).message}`);
  }
}

function extractDocumentFields(text: string): OCRField[] {
  const fields: OCRField[] = [];

  const namePatterns = [
    /(?:name|nom|nombre|nome)\s*[:\-]?\s*([A-Z][a-zA-ZÀ-ÿ\s\-']+)/i,
    /(?:surname|prénom|first\s*name)\s*[:\-]?\s*([A-Z][a-zA-ZÀ-ÿ\s\-']+)/i,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      fields.push({ label: "name", value: match[1].trim(), confidence: 0.8 });
      break;
    }
  }

  const dobPatterns = [
    /(?:date\s*(?:of\s*)?birth|dob|né\(e\)\s*le|fecha\s*de\s*nacimiento)\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})/,
  ];
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      fields.push({ label: "date_of_birth", value: match[1].trim(), confidence: 0.75 });
      break;
    }
  }

  const docNumberPatterns = [
    /(?:document\s*(?:no|number)|passport\s*(?:no|number)|id\s*(?:no|number)|numéro)\s*[:\-]?\s*([A-Z0-9]{5,15})/i,
    /\b([A-Z]{1,3}\d{5,10})\b/,
  ];
  for (const pattern of docNumberPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      fields.push({ label: "document_number", value: match[1].trim(), confidence: 0.7 });
      break;
    }
  }

  const expiryPatterns = [
    /(?:expir|valid\s*until|date\s*d'expiration|vencimiento)\w*\s*[:\-]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
  ];
  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      fields.push({ label: "expiry_date", value: match[1].trim(), confidence: 0.7 });
      break;
    }
  }

  const addressPatterns = [
    /(?:address|adresse|dirección|indirizzo)\s*[:\-]?\s*(.+?)(?:\n|$)/i,
  ];
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[1].trim().length > 5) {
      fields.push({ label: "address", value: match[1].trim(), confidence: 0.6 });
      break;
    }
  }

  return fields;
}

ctx.addEventListener("message", async (event: MessageEvent<OCRRequest>) => {
  const { id, imageData, language } = event.data;

  try {
    await initTesseract(language ?? "eng");

    const blob = new Blob([imageData]);
    const result = await worker.recognize(blob);

    const text = result.data.text;
    const confidence = result.data.confidence;
    const fields = extractDocumentFields(text);

    const response: OCRResponse = {
      id,
      success: true,
      text,
      fields,
      confidence,
    };

    ctx.postMessage(response);
  } catch (err) {
    const response: OCRResponse = {
      id,
      success: false,
      error: (err as Error).message,
    };
    ctx.postMessage(response);
  }
});

ctx.postMessage({ type: "ready" });
