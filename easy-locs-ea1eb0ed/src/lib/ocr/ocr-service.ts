export interface OCRResult {
  text: string;
  fields: Array<{
    label: string;
    value: string;
    confidence: number;
  }>;
  confidence: number;
  needsManualReview: boolean;
}

const CONFIDENCE_THRESHOLD = 60;
let worker: Worker | null = null;
let workerReady = false;
const pendingRequests = new Map<string, {
  resolve: (result: OCRResult) => void;
  reject: (error: Error) => void;
}>();

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(
    new URL("../../workers/ocr-worker.ts", import.meta.url),
    { type: "module" }
  );

  worker.onmessage = (event) => {
    const data = event.data;

    if (data.type === "ready") {
      workerReady = true;
      return;
    }

    const pending = pendingRequests.get(data.id);
    if (!pending) return;
    pendingRequests.delete(data.id);

    if (data.success) {
      pending.resolve({
        text: data.text ?? "",
        fields: data.fields ?? [],
        confidence: data.confidence ?? 0,
        needsManualReview: (data.confidence ?? 0) < CONFIDENCE_THRESHOLD,
      });
    } else {
      pending.reject(new Error(data.error ?? "OCR processing failed"));
    }
  };

  worker.onerror = (event) => {
    console.error("[OCR] Worker error:", event.message);
    for (const [id, pending] of pendingRequests) {
      pending.reject(new Error("OCR worker error"));
      pendingRequests.delete(id);
    }
  };

  return worker;
}

export async function scanDocument(
  imageFile: File | Blob,
  language?: string
): Promise<OCRResult> {
  const w = getWorker();
  const id = crypto.randomUUID();

  const arrayBuffer = await imageFile.arrayBuffer();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("OCR processing timed out"));
    }, 30000);

    pendingRequests.set(id, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    w.postMessage(
      { id, imageData: arrayBuffer, language },
      [arrayBuffer]
    );
  });
}

export async function scanDocumentFromUrl(
  imageUrl: string,
  language?: string
): Promise<OCRResult> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Failed to fetch image");
  const blob = await response.blob();
  return scanDocument(blob, language);
}

export function terminateOCR(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    workerReady = false;
    pendingRequests.clear();
  }
}

export function isOCRAvailable(): boolean {
  return typeof Worker !== "undefined";
}
