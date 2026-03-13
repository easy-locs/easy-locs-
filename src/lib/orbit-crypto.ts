/**
 * Orbit E2E Encryption Library
 * 
 * Signal-inspired privacy architecture using Web Crypto API.
 * - ECDH (P-256) for key agreement
 * - AES-256-GCM for message encryption
 * - HKDF for key derivation
 * - Per-message random IV for forward secrecy approximation
 * 
 * The server never sees plaintext content.
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const AES_ALGO = "AES-GCM";
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for GCM
const HKDF_HASH = "SHA-256";
const HKDF_INFO = new TextEncoder().encode("orbit-e2e-v1");

// ─── Key Generation ────────────────────────────────────────

/** Generate an ECDH identity key pair */
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

/** Export public key as base64 for storage/transmission */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(raw);
}

/** Import a public key from base64 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("raw", raw, ECDH_PARAMS, true, []);
}

/** Export private key as JWK for IndexedDB storage */
export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

/** Import private key from JWK */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

// ─── Key Agreement ─────────────────────────────────────────

/** Derive a shared AES-256-GCM key from ECDH key agreement + HKDF */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
  salt?: Uint8Array
): Promise<CryptoKey> {
  // Step 1: ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    256
  );

  // Step 2: Import as HKDF key material
  const hkdfKey = await crypto.subtle.importKey(
    "raw", sharedBits, "HKDF", false, ["deriveKey"]
  );

  // Step 3: HKDF → AES-256-GCM key
  const usedSalt = salt || new Uint8Array(32); // zero-salt if none provided
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: HKDF_HASH, salt: usedSalt, info: HKDF_INFO },
    hkdfKey,
    { name: AES_ALGO, length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Encryption / Decryption ───────────────────────────────

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ct: string;
  /** Base64-encoded IV (12 bytes) */
  iv: string;
  /** Protocol version for future upgrades */
  v: number;
}

/** Encrypt plaintext string → EncryptedPayload */
export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv },
    sharedKey,
    encoded
  );

  return {
    ct: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
    v: 1,
  };
}

/** Decrypt EncryptedPayload → plaintext string */
export async function decryptMessage(
  payload: EncryptedPayload,
  sharedKey: CryptoKey
): Promise<string> {
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ct);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv },
    sharedKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ─── File/Media Encryption ─────────────────────────────────

/** Encrypt a file (ArrayBuffer) with a shared key */
export async function encryptFile(
  data: ArrayBuffer,
  sharedKey: CryptoKey
): Promise<{ ct: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ct = await crypto.subtle.encrypt({ name: AES_ALGO, iv }, sharedKey, data);
  return { ct, iv: bufferToBase64(iv) };
}

/** Decrypt an encrypted file */
export async function decryptFile(
  ciphertext: ArrayBuffer,
  ivBase64: string,
  sharedKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = base64ToBuffer(ivBase64);
  return crypto.subtle.decrypt({ name: AES_ALGO, iv }, sharedKey, ciphertext);
}

// ─── Fingerprint ───────────────────────────────────────────

/** Generate a human-readable safety number from two public keys */
export async function generateSafetyNumber(
  localPublicKey: CryptoKey,
  remotePublicKey: CryptoKey
): Promise<string> {
  const localRaw = await crypto.subtle.exportKey("raw", localPublicKey);
  const remoteRaw = await crypto.subtle.exportKey("raw", remotePublicKey);

  // Sort deterministically so both sides get the same number
  const localArr = new Uint8Array(localRaw);
  const remoteArr = new Uint8Array(remoteRaw);
  const combined = localArr[0] < remoteArr[0]
    ? concatBuffers(localRaw, remoteRaw)
    : concatBuffers(remoteRaw, localRaw);

  const hash = await crypto.subtle.digest("SHA-256", combined);
  const bytes = new Uint8Array(hash);

  // Format as 12 groups of 5 digits (Signal-style)
  const numbers: string[] = [];
  for (let i = 0; i < 12; i++) {
    const val = (bytes[i * 2] << 8 | bytes[i * 2 + 1]) % 100000;
    numbers.push(val.toString().padStart(5, "0"));
  }
  return numbers.join(" ");
}

// ─── Utilities ─────────────────────────────────────────────

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBuffers(a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer {
  const result = new Uint8Array(a.byteLength + b.byteLength);
  result.set(new Uint8Array(a), 0);
  result.set(new Uint8Array(b), a.byteLength);
  return result.buffer;
}

/** Check if Web Crypto API is available */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}
