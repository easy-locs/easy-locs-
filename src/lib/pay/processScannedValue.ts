/** @deprecated — Use qr-engine decodeQr() + resolveRoute() instead. */
import { parsePaymentQrPayload } from "@/lib/pay/qrPayload";

export type ScanProcessResult =
  | { kind: "payment"; params: URLSearchParams }
  | { kind: "profile"; payload: any }
  | { kind: "unknown"; message: string };

export async function processScannedValue(rawText: string): Promise<ScanProcessResult> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { kind: "unknown", message: "Empty scan result" };
  }

  const parsed = parsePaymentQrPayload(trimmed);

  if (parsed?.type === "wallet_pay") {
    const params = new URLSearchParams();
    if (parsed.recipientUserId) params.set("userId", parsed.recipientUserId);
    if (parsed.recipientOrbitId) params.set("orbitId", parsed.recipientOrbitId);
    if (parsed.recipientEmail) params.set("email", parsed.recipientEmail);
    if (parsed.amount) params.set("amount", String(parsed.amount));
    if (parsed.currency) params.set("currency", parsed.currency);
    if (parsed.note) params.set("note", parsed.note);
    return { kind: "payment", params };
  }

  if (trimmed.startsWith("http")) {
    try {
      const url = new URL(trimmed);
      const userId = url.searchParams.get("userId") || url.searchParams.get("id");
      const email = url.searchParams.get("email");
      const orbitId = url.searchParams.get("orbitId");
      const amount = url.searchParams.get("amount");
      const currency = url.searchParams.get("currency");
      const note = url.searchParams.get("note");

      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (email) params.set("email", email);
      if (orbitId) params.set("orbitId", orbitId);
      if (amount) params.set("amount", amount);
      if (currency) params.set("currency", currency);
      if (note) params.set("note", note);

      if ([...params.keys()].length > 0) {
        return { kind: "payment", params };
      }
    } catch {
      return { kind: "unknown", message: "Invalid URL" };
    }
  }

  if (trimmed.includes("@")) {
    const params = new URLSearchParams();
    params.set("email", trimmed.toLowerCase());
    return { kind: "payment", params };
  }

  if (trimmed.startsWith("orbit_")) {
    const params = new URLSearchParams();
    params.set("orbitId", trimmed);
    return { kind: "payment", params };
  }

  const params = new URLSearchParams();
  params.set("userId", trimmed);
  return { kind: "payment", params };
}
