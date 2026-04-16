import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of two strings of equal length.
 * Returns false on any mismatch (including length mismatch) without leaking
 * timing information about the mismatch position.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ba.byteLength !== bb.byteLength) {
    // Still burn cycles to avoid a trivial length oracle.
    const pad = new Uint8Array(ba.byteLength);
    try { timingSafeEqual(ba, pad); } catch { /* ignore */ }
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/**
 * Verify an HMAC-SHA-256 signature over a raw request body.
 *
 * @param rawBody     Request body as the exact bytes the sender signed.
 * @param signature   Value from the signing header. Accepts either the
 *                    raw hex digest or a `sha256=<hex>` prefix.
 * @param secret      Shared secret configured with the sending service.
 */
export function verifyHmacSha256(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false;
  const stripped = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
  const hmac = createHmac("sha256", secret);
  hmac.update(rawBody);
  const expected = hmac.digest("hex");
  return constantTimeEqual(stripped, expected);
}
