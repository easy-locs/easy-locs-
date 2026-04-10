import { secureStore } from "./native-secure-store";
import { nowIso, randomHex, sha256Base64 } from "./utils";

const DEVICE_META_KEY = "sec_chief_device_meta_v2";
const DEVICE_PRIV_KEY = "sec_chief_device_private_v2";

export interface DeviceIdentityMeta {
  deviceId: string;
  publicKeyJwk: JsonWebKey;
  publicKeyFingerprint: string;
  createdAt: string;
  algorithm: "ECDSA-P256" | "ECDH-P256";
}

export async function createSigningIdentity(): Promise<DeviceIdentityMeta> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const fp = await sha256Base64(JSON.stringify(publicKeyJwk));

  const meta: DeviceIdentityMeta = {
    deviceId: `dev_${randomHex(10)}`,
    publicKeyJwk,
    publicKeyFingerprint: fp,
    createdAt: nowIso(),
    algorithm: "ECDSA-P256",
  };

  await secureStore.set(DEVICE_META_KEY, JSON.stringify(meta));
  await secureStore.set(DEVICE_PRIV_KEY, JSON.stringify(privateKeyJwk));

  return meta;
}

export async function getSigningIdentityMeta(): Promise<DeviceIdentityMeta | null> {
  const raw = await secureStore.get(DEVICE_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceIdentityMeta;
  } catch {
    return null;
  }
}

export async function ensureSigningIdentityMeta(): Promise<DeviceIdentityMeta> {
  const existing = await getSigningIdentityMeta();
  if (existing) return existing;
  return createSigningIdentity();
}

export async function getSigningPrivateKey(): Promise<CryptoKey | null> {
  const raw = await secureStore.get(DEVICE_PRIV_KEY);
  if (!raw) return null;
  try {
    const jwk = JSON.parse(raw) as JsonWebKey;
    return await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  } catch {
    return null;
  }
}

export async function importVerifyKey(publicKeyJwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}
