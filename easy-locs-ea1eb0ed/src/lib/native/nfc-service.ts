export interface NFCTag {
  id: string;
  techTypes: string[];
  records: NFCRecord[];
}

export interface NFCRecord {
  type: string;
  payload: string;
  id?: string;
}

export interface NFCPaymentRequest {
  cardToken: string;
  amount: number;
  currency: string;
  merchantId?: string;
}

export interface NFCPaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

type NFCTagCallback = (tag: NFCTag) => void;
type NFCErrorCallback = (error: Error) => void;

let tagCallbacks: NFCTagCallback[] = [];
let errorCallbacks: NFCErrorCallback[] = [];
let scanning = false;

export async function isNFCAvailable(): Promise<boolean> {
  if ("NDEFReader" in window) return true;

  try {
    const { NFC } = await import("capacitor-nfc");
    const result = await NFC.isEnabled();
    return result.isEnabled;
  } catch (err) {
    console.debug("[nfc] NFC check unavailable:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function startNFCScanning(): Promise<void> {
  if (scanning) return;

  if ("NDEFReader" in window) {
    await startWebNFC();
    return;
  }

  try {
    const { NFC } = await import("capacitor-nfc");

    await NFC.addListener("nfcTagScanned", (event: Record<string, Record<string, unknown>>) => {
      const tag: NFCTag = {
        id: event.tag?.id ?? "",
        techTypes: event.tag?.techTypes ?? [],
        records: (event.tag?.records ?? []).map((r: Record<string, string>) => ({
          type: r.type ?? "",
          payload: r.payload ?? "",
          id: r.id,
        })),
      };
      tagCallbacks.forEach((cb) => cb(tag));
    });

    await NFC.startScanSession();
    scanning = true;
  } catch (err) {
    errorCallbacks.forEach((cb) => cb(err instanceof Error ? err : new Error("NFC start failed")));
  }
}

async function startWebNFC(): Promise<void> {
  try {
    const NDEFReaderCtor = (window as Record<string, unknown>).NDEFReader as new () => {
      addEventListener: (type: string, listener: (event: Record<string, unknown>) => void) => void;
      scan: () => Promise<void>;
    };
    const reader = new NDEFReaderCtor();

    reader.addEventListener("reading", (event: Record<string, unknown>) => {
      const message = event.message as { records?: Array<{ recordType?: string; data?: BufferSource; id?: string }> } | undefined;
      const tag: NFCTag = {
        id: (event.serialNumber as string) ?? "",
        techTypes: ["NDEF"],
        records: (message?.records ?? []).map((r) => ({
          type: r.recordType ?? "",
          payload: r.data ? new TextDecoder().decode(r.data) : "",
          id: r.id,
        })),
      };
      tagCallbacks.forEach((cb) => cb(tag));
    });

    reader.addEventListener("readingerror", () => {
      errorCallbacks.forEach((cb) => cb(new Error("NFC read error")));
    });

    await reader.scan();
    scanning = true;
  } catch (err) {
    errorCallbacks.forEach((cb) => cb(err instanceof Error ? err : new Error("Web NFC not supported")));
  }
}

export async function stopNFCScanning(): Promise<void> {
  if (!scanning) return;

  try {
    const { NFC } = await import("capacitor-nfc");
    await NFC.stopScanSession();
  } catch (err) {
    console.debug("[nfc] stopScanSession unavailable:", err instanceof Error ? err.message : err);
  }

  scanning = false;
}

export function onNFCTag(callback: NFCTagCallback): () => void {
  tagCallbacks.push(callback);
  return () => {
    tagCallbacks = tagCallbacks.filter((cb) => cb !== callback);
  };
}

export function onNFCError(callback: NFCErrorCallback): () => void {
  errorCallbacks.push(callback);
  return () => {
    errorCallbacks = errorCallbacks.filter((cb) => cb !== callback);
  };
}

export async function processNFCPayment(request: NFCPaymentRequest): Promise<NFCPaymentResult> {
  const available = await isNFCAvailable();
  if (!available) {
    return { success: false, error: "NFC not available on this device" };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      stopNFCScanning();
      resolve({ success: false, error: "NFC payment timed out" });
    }, 30000);

    const unsubscribe = onNFCTag(async (tag) => {
      clearTimeout(timeout);
      unsubscribe();
      await stopNFCScanning();

      try {
        const { callEdgeFunction } = await import("@/lib/edge-client");
        const data = await callEdgeFunction<{ transactionId: string }>("wallet-transfer", {
          action: "nfc_payment",
          cardToken: request.cardToken,
          amount: request.amount,
          currency: request.currency,
          merchantId: request.merchantId,
          nfcTagId: tag.id,
        });
        resolve({ success: true, transactionId: data.transactionId });
      } catch (err) {
        resolve({ success: false, error: err instanceof Error ? err.message : "Payment processing failed" });
      }
    });

    startNFCScanning();
  });
}

export async function writeNFCTag(records: NFCRecord[]): Promise<boolean> {
  if ("NDEFReader" in window) {
    try {
      const NDEFReaderCtor = (window as Record<string, unknown>).NDEFReader as new () => { write: (data: unknown) => Promise<void> };
      const writer = new NDEFReaderCtor();
      await writer.write({
        records: records.map((r) => ({
          recordType: r.type,
          data: new TextEncoder().encode(r.payload),
        })),
      });
      return true;
    } catch (err) {
      console.warn("[nfc] Web NFC write failed:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  try {
    const { NFC } = await import("capacitor-nfc");
    await NFC.write({
      records: records.map((r) => ({
        type: r.type,
        payload: r.payload,
      })),
    });
    return true;
  } catch (err) {
    console.warn("[nfc] Capacitor NFC write failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export function isNFCScanning(): boolean {
  return scanning;
}
