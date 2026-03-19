/**
 * Orbit Key Trust — Trust-on-first-use fingerprint verification.
 * Stores known key fingerprints locally, warns on unexpected changes.
 */

const TRUST_STORE_PREFIX = "orbit_key_trust:";

export type TrustVerdict = "trusted" | "new_key" | "key_changed" | "unknown";

/** Compute SHA-256 fingerprint of a JWK public key, truncated to 32 hex chars */
export async function fingerprintPublicKey(jwk: JsonWebKey): Promise<string> {
  // Canonical: sort keys for deterministic hash
  const canonical = JSON.stringify(jwk, Object.keys(jwk).sort());
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/** Format fingerprint for human display: groups of 4 */
export function formatFingerprint(fp: string): string {
  return fp.match(/.{1,4}/g)?.join(" ") ?? fp;
}

/** Get stored fingerprint for an identity */
export function getStoredFingerprint(identityId: string): string | null {
  return localStorage.getItem(`${TRUST_STORE_PREFIX}${identityId}`);
}

/** Trust a fingerprint (TOFU — trust on first use) */
export function trustFingerprint(identityId: string, fingerprint: string): void {
  localStorage.setItem(`${TRUST_STORE_PREFIX}${identityId}`, fingerprint);
}

/** Remove trust for an identity */
export function revokeTrust(identityId: string): void {
  localStorage.removeItem(`${TRUST_STORE_PREFIX}${identityId}`);
}

/** Verify a public key fingerprint against stored trust. Returns verdict. */
export async function verifyFingerprintOrWarn(
  identityId: string,
  publicKeyJwk: JsonWebKey
): Promise<{ verdict: TrustVerdict; fingerprint: string; storedFingerprint: string | null }> {
  const fingerprint = await fingerprintPublicKey(publicKeyJwk);
  const stored = getStoredFingerprint(identityId);

  if (!stored) {
    // First encounter — TOFU
    trustFingerprint(identityId, fingerprint);
    return { verdict: "new_key", fingerprint, storedFingerprint: null };
  }

  if (stored === fingerprint) {
    return { verdict: "trusted", fingerprint, storedFingerprint: stored };
  }

  // Key changed unexpectedly
  console.warn("[orbit-key-trust] KEY CHANGED for identity", identityId);
  return { verdict: "key_changed", fingerprint, storedFingerprint: stored };
}

/** List all trusted identity IDs */
export function listTrustedIdentities(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(TRUST_STORE_PREFIX)) {
      ids.push(key.slice(TRUST_STORE_PREFIX.length));
    }
  }
  return ids;
}

/** Clear all trust data (use on factory reset / risk event) */
export function clearAllTrust(): void {
  listTrustedIdentities().forEach(revokeTrust);
}
