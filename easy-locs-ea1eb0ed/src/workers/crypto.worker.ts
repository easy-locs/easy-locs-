import * as Comlink from "comlink";

export interface CryptoWorkerAPI {
  encrypt(
    plaintext: string,
    keyBase64: string,
  ): Promise<{ ciphertext: string; iv: string }>;
  decrypt(
    ciphertext: string,
    iv: string,
    keyBase64: string,
  ): Promise<string>;
  generateKey(): Promise<string>;
  hash(data: string): Promise<string>;
  deriveKey(
    password: string,
    salt: string,
  ): Promise<string>;
}

const ALGO = "AES-GCM";

async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: ALGO }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const api: CryptoWorkerAPI = {
  async encrypt(plaintext, keyBase64) {
    const key = await importKey(keyBase64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: ALGO, iv },
      key,
      encoded,
    );
    return {
      ciphertext: toBase64(cipherBuffer),
      iv: toBase64(iv.buffer),
    };
  },

  async decrypt(ciphertext, iv, keyBase64) {
    const key = await importKey(keyBase64);
    const cipherBuffer = fromBase64(ciphertext);
    const ivBuffer = fromBase64(iv);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv: ivBuffer },
      key,
      cipherBuffer,
    );
    return new TextDecoder().decode(decrypted);
  },

  async generateKey() {
    const key = await crypto.subtle.generateKey(
      { name: ALGO, length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
    const raw = await crypto.subtle.exportKey("raw", key);
    return toBase64(raw);
  },

  async hash(data) {
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return toBase64(hashBuffer);
  },

  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: 100_000,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    );
    return toBase64(bits);
  },
};

Comlink.expose(api);
