/**
 * Orbit QR Security — Signature generation, validation, and anti-replay
 */
import type { DynamicQRPayload, StaticQRPayload, QRPayload } from "./types";

/** Generate a cryptographic nonce */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate HMAC-SHA256 signature for QR payloads */
export async function signPayload(payload: Omit<DynamicQRPayload, "signature">): Promise<string> {
  const data = [
    payload.qr_type,
    payload.recipient_user_id,
    payload.amount.toString(),
    payload.currency,
    payload.nonce,
    payload.expires_at,
  ].join("|");

  const encoder = new TextEncoder();
  // Use a client-side key derived from user context (not secret, but tamper-resistant)
  const keyData = encoder.encode(`orbit-pay-v1-${payload.recipient_user_id}`);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify a dynamic QR payload signature */
export async function verifyPayloadSignature(payload: DynamicQRPayload): Promise<boolean> {
  const { signature, ...rest } = payload;
  const expected = await signPayload(rest);
  return expected === signature;
}

/** Check if a dynamic QR payload has expired */
export function isPayloadExpired(payload: DynamicQRPayload): boolean {
  return new Date(payload.expires_at) < new Date();
}

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

/** Create a static QR payload */
export function createStaticQR(opts: {
  userId: string;
  name: string;
  type: StaticQRPayload["recipient_type"];
  orgId?: string;
}): StaticQRPayload {
  return {
    qr_type: "static",
    version: 1,
    recipient_user_id: opts.userId,
    recipient_name: opts.name,
    recipient_type: opts.type,
    org_id: opts.orgId,
    created_at: new Date().toISOString(),
  };
}

/** Create a dynamic QR payload (auto-signed) */
export async function createDynamicQR(opts: {
  userId: string;
  name: string;
  amount: number;
  currency: string;
  locsEquivalent?: number;
  referenceType?: DynamicQRPayload["reference_type"];
  referenceId?: string;
  description?: string;
  expiresInMinutes?: number;
}): Promise<DynamicQRPayload> {
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + (opts.expiresInMinutes || 30) * 60 * 1000).toISOString();

  const base: Omit<DynamicQRPayload, "signature"> = {
    qr_type: "dynamic",
    version: 1,
    recipient_user_id: opts.userId,
    recipient_name: opts.name,
    amount: opts.amount,
    currency: opts.currency,
    locs_equivalent: opts.locsEquivalent,
    reference_type: opts.referenceType,
    reference_id: opts.referenceId,
    description: opts.description,
    expires_at: expiresAt,
    nonce,
  };

  const signature = await signPayload(base);
  return { ...base, signature };
}

/** Used nonces tracker (in-memory anti-replay for client-side) */
const usedNonces = new Set<string>();
const MAX_NONCES = 1000;

export function isNonceUsed(nonce: string): boolean {
  return usedNonces.has(nonce);
}

export function markNonceUsed(nonce: string): void {
  if (usedNonces.size >= MAX_NONCES) {
    const first = usedNonces.values().next().value;
    if (first) usedNonces.delete(first);
  }
  usedNonces.add(nonce);
}
