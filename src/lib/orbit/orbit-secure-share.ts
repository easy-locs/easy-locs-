/**
 * Orbit Secure Share — Short-lived, single-use share/invite tokens.
 * Resolves opaque tokens to context, prevents replay and URL-based leaks.
 */

export interface SecureShareToken {
  tokenId: string;
  opaqueRef: string;
  encryptedPayload: string;
  nonce: string;
  expiresAt: number;
  maxUses: number;
  usesConsumed: number;
  createdAt: number;
  revoked: boolean;
}

// In-memory token store (production would use server-side storage)
const tokenStore = new Map<string, SecureShareToken>();
const consumedNonces = new Set<string>();

/** Create a secure, short-lived share token with encrypted payload */
export async function createSecureShareToken(opts: {
  payload: unknown;
  key: CryptoKey;
  ttlMs?: number;
  maxUses?: number;
}): Promise<SecureShareToken> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(opts.payload));

  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, opts.key, plaintext);

  const token: SecureShareToken = {
    tokenId: crypto.randomUUID(),
    opaqueRef: crypto.randomUUID().replace(/-/g, ""),
    encryptedPayload: uint8ToB64(new Uint8Array(cipher)),
    nonce: uint8ToB64(iv),
    expiresAt: Date.now() + (opts.ttlMs ?? 10 * 60_000),
    maxUses: opts.maxUses ?? 1,
    usesConsumed: 0,
    createdAt: Date.now(),
    revoked: false,
  };

  tokenStore.set(token.opaqueRef, token);
  return token;
}

/** Validate and consume a share token, returning decrypted payload */
export async function validateSecureShareToken(
  opaqueRef: string,
  key: CryptoKey
): Promise<{ valid: boolean; payload?: unknown; reason?: string }> {
  const token = tokenStore.get(opaqueRef);

  if (!token) return { valid: false, reason: "token_not_found" };
  if (token.revoked) return { valid: false, reason: "token_revoked" };
  if (Date.now() > token.expiresAt) return { valid: false, reason: "token_expired" };
  if (token.usesConsumed >= token.maxUses) return { valid: false, reason: "max_uses_exceeded" };

  // Anti-replay
  const replayKey = `${opaqueRef}:${token.usesConsumed}`;
  if (consumedNonces.has(replayKey)) return { valid: false, reason: "replay_detected" };
  consumedNonces.add(replayKey);

  token.usesConsumed++;

  try {
    const iv = b64ToUint8(token.nonce);
    const cipher = b64ToUint8(token.encryptedPayload);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    const payload = JSON.parse(new TextDecoder().decode(decrypted));
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "decryption_failed" };
  }
}

/** Revoke a share token immediately */
export function revokeSecureShareToken(opaqueRef: string): boolean {
  const token = tokenStore.get(opaqueRef);
  if (!token) return false;
  token.revoked = true;
  return true;
}

/** Clean up expired tokens from memory */
export function purgeExpiredTokens(): number {
  let count = 0;
  const now = Date.now();
  for (const [ref, token] of tokenStore) {
    if (now > token.expiresAt || token.revoked) {
      tokenStore.delete(ref);
      count++;
    }
  }
  return count;
}

// ── helpers ──
function uint8ToB64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}
function b64ToUint8(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}
