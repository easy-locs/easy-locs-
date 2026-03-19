/**
 * Device Identity — ECDH P-256 keypair bound to device via localStorage.
 */

const DEVICE_META_STORAGE = "el_device_meta_v1";
const DEVICE_KEY_STORAGE = "el_device_key_v1";

export interface DeviceIdentity {
  deviceId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyStored: boolean;
  createdAt: string;
}

function randomId(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export async function createDeviceIdentity(): Promise<DeviceIdentity> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

  localStorage.setItem(DEVICE_KEY_STORAGE, JSON.stringify(privateKeyJwk));

  const meta: DeviceIdentity = {
    deviceId: `dev_${randomId(16)}`,
    publicKeyJwk,
    privateKeyStored: true,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(DEVICE_META_STORAGE, JSON.stringify(meta));
  return meta;
}

export function getStoredDeviceIdentity(): DeviceIdentity | null {
  const raw = localStorage.getItem(DEVICE_META_STORAGE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceIdentity;
  } catch {
    return null;
  }
}

export async function getStoredPrivateKey(): Promise<CryptoKey | null> {
  const raw = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!raw) return null;

  try {
    const jwk = JSON.parse(raw) as JsonWebKey;
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
  } catch {
    return null;
  }
}
