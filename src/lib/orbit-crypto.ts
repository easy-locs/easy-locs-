/**
 * Orbit E2E Encryption Library
 * 
 * Signal-inspired privacy architecture using Web Crypto API.
 * - ECDH (P-256) for key agreement
 * - AES-256-GCM for message encryption
 * - HKDF for key derivation
 * - Per-message random IV for forward secrecy approximation
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const AES_ALGO = "AES-GCM";
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const HKDF_HASH = "SHA-256";
const HKDF_INFO = new TextEncoder().encode("orbit-e2e-v1");

// ─── Key Generation ────────────────────────────────────────

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(new Uint8Array(raw));
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, ECDH_PARAMS, true, []);
}

export async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);
}

// ─── Key Agreement ─────────────────────────────────────────

export async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
  salt?: Uint8Array
): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    256
  );

  const hkdfKey = await crypto.subtle.importKey(
    "raw", sharedBits, "HKDF", false, ["deriveKey"]
  );

  const usedSalt = salt || new Uint8Array(32);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: HKDF_HASH, salt: usedSalt.buffer as ArrayBuffer, info: HKDF_INFO.buffer as ArrayBuffer },
    hkdfKey,
    { name: AES_ALGO, length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Encryption / Decryption ───────────────────────────────

export interface EncryptedPayload {
  ct: string;
  iv: string;
  v: number;
}

export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv: iv.buffer as ArrayBuffer },
    sharedKey,
    encoded.buffer as ArrayBuffer
  );

  return {
    ct: bufferToBase64(new Uint8Array(ciphertext)),
    iv: bufferToBase64(iv),
    v: 1,
  };
}

export async function decryptMessage(
  payload: EncryptedPayload,
  sharedKey: CryptoKey
): Promise<string> {
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ct);

  const decrypted = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv: iv.buffer as ArrayBuffer },
    sharedKey,
    ciphertext.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

// ─── File/Media Encryption ─────────────────────────────────

export async function encryptFile(
  data: ArrayBuffer,
  sharedKey: CryptoKey
): Promise<{ ct: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ct = await crypto.subtle.encrypt({ name: AES_ALGO, iv: iv.buffer as ArrayBuffer }, sharedKey, data);
  return { ct, iv: bufferToBase64(iv) };
}

export async function decryptFile(
  ciphertext: ArrayBuffer,
  ivBase64: string,
  sharedKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = base64ToBuffer(ivBase64);
  return crypto.subtle.decrypt({ name: AES_ALGO, iv: iv.buffer as ArrayBuffer }, sharedKey, ciphertext);
}

// ─── Fingerprint ───────────────────────────────────────────

export async function generateSafetyNumber(
  localPublicKey: CryptoKey,
  remotePublicKey: CryptoKey
): Promise<string> {
  const localRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localPublicKey));
  const remoteRaw = new Uint8Array(await crypto.subtle.exportKey("raw", remotePublicKey));

  const first = localRaw[0] < remoteRaw[0] ? localRaw : remoteRaw;
  const second = localRaw[0] < remoteRaw[0] ? remoteRaw : localRaw;
  const combined = new Uint8Array(first.length + second.length);
  combined.set(first, 0);
  combined.set(second, first.length);

  const hash = await crypto.subtle.digest("SHA-256", combined.buffer as ArrayBuffer);
  const bytes = new Uint8Array(hash);

  const numbers: string[] = [];
  for (let i = 0; i < 12; i++) {
    const val = (bytes[i * 2] << 8 | bytes[i * 2 + 1]) % 100000;
    numbers.push(val.toString().padStart(5, "0"));
  }
  return numbers.join(" ");
}

// ─── Utilities ─────────────────────────────────────────────

function bufferToBase64(bytes: Uint8Array): string {
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

export function isCryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}
