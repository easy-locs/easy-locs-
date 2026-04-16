import { exposeWorkerMethods } from "./worker-rpc";

interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  algorithm: "AES-GCM";
}

function toBase64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function fromBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importRawKey(rawBase64: string): Promise<CryptoKey> {
  const raw = fromBase64(rawBase64);
  return crypto.subtle.importKey(
    "raw",
    raw.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

interface EncryptRequest {
  plaintext: string;
  keyBase64: string;
}

interface DecryptRequest {
  payload: EncryptedPayload;
  keyBase64: string;
}

async function encrypt(request: EncryptRequest): Promise<EncryptedPayload> {
  const key = await importRawKey(request.keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(request.plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoded,
  );
  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    algorithm: "AES-GCM",
  };
}

async function decrypt(request: DecryptRequest): Promise<string> {
  const key = await importRawKey(request.keyBase64);
  const iv = fromBase64(request.payload.iv);
  const ciphertext = fromBase64(request.payload.ciphertext);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(plain);
}

const workerMethods = {
  encrypt,
  decrypt,
};

export type CryptoWorkerMethods = typeof workerMethods;

exposeWorkerMethods(workerMethods);
