/**
 * Orbit Hybrid Session Bootstrap — Domain-separated key derivation.
 * Uses ECDH P-256 for session agreement + HKDF for per-domain keys.
 * Post-quantum (ML-KEM) branch is architecture-ready but not yet active.
 */

export type OrbitKeyDomain = "orbit_message_key" | "orbit_call_key" | "orbit_share_key";

export interface HybridSessionRequest {
  ephemeralPublicKey: JsonWebKey;
  requestId: string;
  createdAt: number;
  domains: OrbitKeyDomain[];
}

export interface HybridSessionKeys {
  orbit_message_key: CryptoKey;
  orbit_call_key: CryptoKey;
  orbit_share_key: CryptoKey;
}

/** Generate an ephemeral ECDH keypair for session negotiation */
async function generateEphemeralPair() {
  return crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
}

/** Create a session request with an ephemeral public key */
export async function createHybridSessionRequest(
  domains: OrbitKeyDomain[] = ["orbit_message_key", "orbit_call_key", "orbit_share_key"]
): Promise<{ request: HybridSessionRequest; privateKey: CryptoKey }> {
  const pair = await generateEphemeralPair();
  const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    request: {
      ephemeralPublicKey: pubJwk,
      requestId: crypto.randomUUID(),
      createdAt: Date.now(),
      domains,
    },
    privateKey: pair.privateKey,
  };
}

/** Accept a session request and derive shared domain keys */
export async function acceptHybridSessionRequest(
  incoming: HybridSessionRequest,
  localPrivateKey: CryptoKey
): Promise<HybridSessionKeys> {
  const peerPub = await crypto.subtle.importKey(
    "jwk",
    incoming.ephemeralPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPub },
    localPrivateKey,
    256
  );

  return deriveOrbitSessionKeys(new Uint8Array(sharedBits), incoming.requestId);
}

/** Derive per-domain AES-GCM keys via HKDF from shared secret */
export async function deriveOrbitSessionKeys(
  sharedSecret: Uint8Array,
  salt: string
): Promise<HybridSessionKeys> {
  const baseKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  const saltBytes = new TextEncoder().encode(salt);

  const derive = (info: string) =>
    crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: saltBytes, info: new TextEncoder().encode(info) },
      baseKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

  const [messageKey, callKey, shareKey] = await Promise.all([
    derive("orbit_message_key"),
    derive("orbit_call_key"),
    derive("orbit_share_key"),
  ]);

  return {
    orbit_message_key: messageKey,
    orbit_call_key: callKey,
    orbit_share_key: shareKey,
  };
}

/** Rotate session keys by generating new ephemeral pair + re-deriving */
export async function rotateOrbitSessionKeys(
  peerPublicJwk: JsonWebKey,
  reason: string
): Promise<{ keys: HybridSessionKeys; newPublicKey: JsonWebKey }> {
  const pair = await generateEphemeralPair();
  const newPubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  const peerPub = await crypto.subtle.importKey(
    "jwk",
    peerPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: peerPub }, pair.privateKey, 256);
  const keys = await deriveOrbitSessionKeys(new Uint8Array(bits), `rotate:${reason}:${Date.now()}`);

  console.info("[orbit-hybrid-session] keys rotated", { reason });
  return { keys, newPublicKey: newPubJwk };
}
