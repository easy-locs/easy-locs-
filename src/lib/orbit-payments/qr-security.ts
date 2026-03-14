/**
 * Orbit QR Security — Client utilities (signing moved server-side)
 * Client only handles encoding/decoding and basic checks.
 * All signing & nonce validation happens on the server.
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
