/**
 * Orbit device key generation and local storage helpers.
 */

export async function generateOrbitKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKey, privateKey };
}

export function saveOrbitPrivateKey(identityId: string, privateKey: JsonWebKey) {
  localStorage.setItem(`orbit_private_key:${identityId}`, JSON.stringify(privateKey));
}

export function loadOrbitPrivateKey(identityId: string): JsonWebKey | null {
  const raw = localStorage.getItem(`orbit_private_key:${identityId}`);
  return raw ? JSON.parse(raw) : null;
}
