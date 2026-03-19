/**
 * Orbit Envelope — Metadata-minimized message/signal wrapper.
 * Pads payloads to fixed buckets, uses opaque alias refs, enforces TTL.
 */

const PADDING_BUCKETS = [256, 512, 1024, 2048, 4096, 8192];

export interface OrbitEnvelope {
  envelope_id: string;
  recipient_route_id: string;
  encrypted_payload: string;
  nonce: string;
  aad: string;
  ttl_ms: number;
  created_at: number;
  sender_alias_ref: string;
  padding_size: number;
  delivery_token_hash?: string;
}

/** Pad plaintext bytes to nearest bucket to resist traffic analysis */
export function padPayload(input: Uint8Array): Uint8Array {
  const target = PADDING_BUCKETS.find((b) => input.length <= b) ?? PADDING_BUCKETS[PADDING_BUCKETS.length - 1];
  const out = new Uint8Array(target);
  // Store original length in last 4 bytes
  const view = new DataView(out.buffer);
  view.setUint32(target - 4, input.length, true);
  out.set(input, 0);
  return out;
}

/** Remove padding, recovering original payload */
export function unpadPayload(input: Uint8Array): Uint8Array {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const originalLen = view.getUint32(input.length - 4, true);
  if (originalLen > input.length - 4 || originalLen === 0) {
    // Fallback: strip trailing zeros
    let end = input.length;
    while (end > 0 && input[end - 1] === 0) end--;
    return input.slice(0, end);
  }
  return input.slice(0, originalLen);
}

/** Create a metadata-minimized envelope */
export async function createOrbitEnvelope(opts: {
  recipientRouteId: string;
  senderAliasRef: string;
  plaintext: Uint8Array;
  key: CryptoKey;
  ttlMs?: number;
  aad?: string;
  deliveryTokenHash?: string;
}): Promise<OrbitEnvelope> {
  const padded = padPayload(opts.plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aadBytes = new TextEncoder().encode(opts.aad ?? "orbit-envelope");

  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer, additionalData: aadBytes as unknown as ArrayBuffer },
    opts.key,
    padded as unknown as ArrayBuffer
  );

  return {
    envelope_id: crypto.randomUUID(),
    recipient_route_id: opts.recipientRouteId,
    encrypted_payload: uint8ToB64(new Uint8Array(cipherBuf)),
    nonce: uint8ToB64(iv),
    aad: opts.aad ?? "orbit-envelope",
    ttl_ms: opts.ttlMs ?? 30_000,
    created_at: Date.now(),
    sender_alias_ref: opts.senderAliasRef,
    padding_size: padded.length,
    delivery_token_hash: opts.deliveryTokenHash,
  };
}

/** Parse and decrypt an envelope, rejecting expired ones */
export async function parseOrbitEnvelope(
  envelope: OrbitEnvelope,
  key: CryptoKey
): Promise<{ payload: Uint8Array; expired: boolean }> {
  const age = Date.now() - envelope.created_at;
  if (age > envelope.ttl_ms) {
    return { payload: new Uint8Array(0), expired: true };
  }

  const iv = b64ToUint8(envelope.nonce);
  const cipher = b64ToUint8(envelope.encrypted_payload);
  const aadBytes = new TextEncoder().encode(envelope.aad);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer, additionalData: aadBytes as unknown as ArrayBuffer },
    key,
    cipher as unknown as ArrayBuffer
  );

  return { payload: unpadPayload(new Uint8Array(decrypted)), expired: false };
}

// ── helpers ──
function uint8ToB64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}
function b64ToUint8(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}
