/**
 * @deprecated — Use src/lib/qr-engine.ts instead.
 * Orbit QR Security — kept for backward compatibility only.
 */
import type { QRPayload } from "./types";

/** Encode QR payload to string */
export function encodeQRPayload(payload: QRPayload): string {
  return btoa(JSON.stringify(payload));
}

/** Decode QR payload from string */
export function decodeQRPayload(encoded: string): QRPayload | null {
  try {
    const decoded = JSON.parse(atob(encoded));
    if (!decoded.qr_type || !decoded.version) return null;
    return decoded as QRPayload;
  } catch {
    return null;
  }
}

/** Check if a dynamic QR payload has expired (client-side pre-check) */
export function isPayloadExpired(payload: QRPayload): boolean {
  if (payload.qr_type !== "dynamic") return false;
  return new Date(payload.expires_at) < new Date();
}
