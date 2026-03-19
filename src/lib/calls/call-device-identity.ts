/**
 * Call Device Identity — Device-bound keypair for call authorization.
 * Separate from chat/wallet/ghost key domains.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const DEVICE_ID_KEY = "orbit:call-device-id";
const PRIVATE_KEY_KEY = "orbit:call-device-privkey";

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function generateCallKeypair() {
  const kp = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  return { publicJwk, privateJwk };
}

export async function ensureCallDeviceIdentity(userId: string) {
  const deviceId = getOrCreateDeviceId();

  const { data: existing } = await supabase
    .from("call_device_identities")
    .select("*")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("call_device_identities")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    console.log("[call-vault] device_identity_exists", { deviceId, version: existing.key_version });
    return existing;
  }

  const { publicJwk, privateJwk } = await generateCallKeypair();
  localStorage.setItem(PRIVATE_KEY_KEY, JSON.stringify(privateJwk));

  const { data, error } = await supabase
    .from("call_device_identities")
    .insert({
      user_id: userId,
      device_id: deviceId,
      public_key_jwk: publicJwk as unknown as Json,
      key_version: 1,
      trusted: true,
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[call-vault] device_identity_registered", { deviceId });
  return data;
}

export async function getCallDevicePublicKey(userId: string): Promise<JsonWebKey | null> {
  const deviceId = getOrCreateDeviceId();
  const { data } = await supabase
    .from("call_device_identities")
    .select("public_key_jwk")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  return data?.public_key_jwk as unknown as JsonWebKey ?? null;
}

export async function signCallAuthPayload(payload: string): Promise<string> {
  const raw = localStorage.getItem(PRIVATE_KEY_KEY);
  if (!raw) throw new Error("No call device private key");

  const jwk = JSON.parse(raw) as JsonWebKey;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(payload)
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function rotateCallDeviceIdentity(userId: string) {
  const deviceId = getOrCreateDeviceId();
  const { publicJwk, privateJwk } = await generateCallKeypair();
  localStorage.setItem(PRIVATE_KEY_KEY, JSON.stringify(privateJwk));

  const { data: existing } = await supabase
    .from("call_device_identities")
    .select("key_version")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  const newVersion = (existing?.key_version ?? 0) + 1;

  const { error } = await supabase
    .from("call_device_identities")
    .update({
      public_key_jwk: publicJwk as unknown as Json,
      key_version: newVersion,
      last_seen_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("device_id", deviceId);

  if (error) throw error;
  console.log("[call-vault] device_identity_rotated", { deviceId, version: newVersion });
}
