export interface NfcTagData {
  id: string;
  type: string;
  records: NfcRecord[];
}

export interface NfcRecord {
  type: string;
  payload: string;
}

export interface TapToPayResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface PropertyCheckInResult {
  success: boolean;
  tagId: string;
  propertyId?: string;
  timestamp: string;
}

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
  NDEFReader?: new () => EventTarget & { scan: () => Promise<void> };
}

function isNative(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

async function generatePayloadSignature(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

class NfcService {
  private available: boolean | null = null;
  private listening = false;
  private tagListeners = new Set<(tag: NfcTagData) => void>();

  async checkAvailability(): Promise<boolean> {
    if (this.available !== null) return this.available;

    if (isNative()) {
      try {
        const { NFC } = await import("capacitor-nfc" as string);
        const status = await NFC.isEnabled();
        this.available = status?.isEnabled ?? false;
        return this.available;
      } catch {
        this.available = false;
        return false;
      }
    }

    if ("NDEFReader" in window) {
      this.available = true;
      return true;
    }

    this.available = false;
    return false;
  }

  async startListening(): Promise<boolean> {
    if (this.listening) return true;
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) return false;

    if (isNative()) {
      return this.startNativeListening();
    }

    return this.startWebNfcListening();
  }

  private async startNativeListening(): Promise<boolean> {
    try {
      const { NFC } = await import("capacitor-nfc" as string);
      await NFC.addListener("nfcTagScanned", (event: Record<string, unknown>) => {
        const tagData = event.tag as Record<string, unknown> | undefined;
        const tag: NfcTagData = {
          id: (tagData?.id ?? event.id ?? "") as string,
          type: ((tagData?.techTypes as string[])?.[0] ?? "unknown"),
          records: (
            (tagData?.records ?? (event.messages as Array<Record<string, unknown>>)?.[0]?.records ?? []) as Array<Record<string, string>>
          ).map((r) => ({
            type: r.type ?? "unknown",
            payload: r.payload ?? "",
          })),
        };
        this.notifyListeners(tag);
      });

      await NFC.startScanSession();
      this.listening = true;
      return true;
    } catch (e) {
      console.warn("[nfc-service] Native NFC start failed:", e);
      return false;
    }
  }

  private async startWebNfcListening(): Promise<boolean> {
    try {
      const NDEFReaderCtor = (window as unknown as CapacitorWindow).NDEFReader;
      if (!NDEFReaderCtor) return false;

      const ndef = new NDEFReaderCtor();
      await ndef.scan();

      ndef.addEventListener("reading", ((event: CustomEvent & { serialNumber?: string; message?: { records?: Array<{ recordType: string; data: BufferSource }> } }) => {
        const tag: NfcTagData = {
          id: event.serialNumber ?? "",
          type: "ndef",
          records: Array.from(event.message?.records ?? []).map((r) => ({
            type: r.recordType ?? "unknown",
            payload: new TextDecoder().decode(r.data),
          })),
        };
        this.notifyListeners(tag);
      }) as EventListener);

      this.listening = true;
      return true;
    } catch (e) {
      console.warn("[nfc-service] Web NFC start failed:", e);
      return false;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.listening) return;

    if (isNative()) {
      try {
        const { NFC } = await import("capacitor-nfc" as string);
        await NFC.stopScanSession();
      } catch {}
    }

    this.listening = false;
  }

  private notifyListeners(tag: NfcTagData): void {
    for (const fn of this.tagListeners) {
      try { fn(tag); } catch {}
    }
  }

  onTagScanned(fn: (tag: NfcTagData) => void): () => void {
    this.tagListeners.add(fn);
    return () => this.tagListeners.delete(fn);
  }

  async initiateTapToPay(params: {
    amount: number;
    currency: string;
    walletId: string;
    merchantId?: string;
  }): Promise<TapToPayResult> {
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      return { success: false, error: "NFC not available on this device" };
    }

    if (!isNative()) {
      return { success: false, error: "Tap-to-pay requires the native app" };
    }

    try {
      const { NFC } = await import("capacitor-nfc" as string);
      const transactionId = `txn_${Date.now()}_${crypto.getRandomValues(new Uint8Array(4)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}`;
      const timestamp = new Date().toISOString();

      const payloadObj = {
        type: "tap_to_pay",
        version: 1,
        transactionId,
        amount: params.amount,
        currency: params.currency,
        walletId: params.walletId,
        merchantId: params.merchantId,
        timestamp,
      };

      const payloadStr = JSON.stringify(payloadObj);
      const signature = await generatePayloadSignature(payloadStr + transactionId);

      const signedPayload = JSON.stringify({
        ...payloadObj,
        signature,
      });

      await NFC.write({
        records: [{ type: "text", payload: signedPayload }],
      });

      return { success: true, transactionId };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tap-to-pay failed";
      return { success: false, error: msg };
    }
  }

  async readPropertyCheckIn(): Promise<PropertyCheckInResult> {
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      return { success: false, tagId: "", timestamp: new Date().toISOString() };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve({ success: false, tagId: "", timestamp: new Date().toISOString() });
      }, 30000);

      const cleanup = this.onTagScanned((tag) => {
        clearTimeout(timeout);
        cleanup();

        let propertyId: string | undefined;
        for (const record of tag.records) {
          try {
            const data = JSON.parse(record.payload) as Record<string, unknown>;
            if (typeof data.propertyId === "string") {
              propertyId = data.propertyId;
              break;
            }
          } catch {}
        }

        resolve({
          success: true,
          tagId: tag.id,
          propertyId,
          timestamp: new Date().toISOString(),
        });
      });

      this.startListening();
    });
  }

  isListening(): boolean {
    return this.listening;
  }

  isNfcAvailable(): boolean {
    return this.available === true;
  }
}

export const nfcService = new NfcService();
