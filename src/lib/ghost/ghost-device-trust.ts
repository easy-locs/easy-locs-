/**
 * Ghost Device Trust — Device registration, trust verification, anti-cloning.
 */
import { supabase } from "@/integrations/supabase/client";
import { getGhostPolicy, GhostTier } from "./ghost-policy";

function getDeviceId(): string {
  let id = localStorage.getItem("ghost:device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ghost:device-id", id);
  }
  return id;
}

async function generateDeviceKeypair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return { publicJwk, privateJwk };
}

export async function registerGhostDevice(ghostProfileId: string, tier: GhostTier) {
  const policy = getGhostPolicy(tier);
  const deviceId = getDeviceId();

  // Check existing device count
  const { data: existingDevices } = await supabase
    .from("ghost_device_identities")
    .select("id")
    .eq("ghost_profile_id", ghostProfileId);

  if ((existingDevices?.length ?? 0) >= policy.maxActiveDevices) {
    console.warn("[ghost] device_limit_reached", { max: policy.maxActiveDevices });
    throw new Error("Maximum active devices reached for this ghost profile");
  }

  // Check if this device already registered
  const { data: existing } = await supabase
    .from("ghost_device_identities")
    .select("*")
    .eq("ghost_profile_id", ghostProfileId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    // Update last_seen
    await supabase
      .from("ghost_device_identities")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    console.log("[ghost] device_seen", { deviceId, trusted: existing.trusted });
    return existing;
  }

  // Register new device
  const { publicJwk, privateJwk } = await generateDeviceKeypair();

  // Store private key locally only
  localStorage.setItem(`ghost:device-key:${ghostProfileId}`, JSON.stringify(privateJwk));

  const { data, error } = await supabase
    .from("ghost_device_identities")
    .insert({
      ghost_profile_id: ghostProfileId,
      device_id: deviceId,
      public_key_jwk: publicJwk as unknown as import("@/integrations/supabase/types").Json,
      key_version: 1,
      trusted: !policy.deviceTrustRequired, // V2: auto-trust, V3: pending
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] device_registered", { deviceId, trusted: data.trusted });

  // Audit
  await logGhostAudit(ghostProfileId, "device_registered", "info", `Device ${deviceId} registered`);

  return data;
}

export async function trustDevice(deviceIdentityId: string, ghostProfileId: string) {
  const { error } = await supabase
    .from("ghost_device_identities")
    .update({ trusted: true })
    .eq("id", deviceIdentityId)
    .eq("ghost_profile_id", ghostProfileId);

  if (error) throw error;
  console.log("[ghost] device_trusted", { deviceIdentityId });
  await logGhostAudit(ghostProfileId, "device_trusted", "info", `Device ${deviceIdentityId} trusted`);
}

export async function isDeviceTrusted(ghostProfileId: string): Promise<boolean> {
  const deviceId = getDeviceId();
  const { data } = await supabase
    .from("ghost_device_identities")
    .select("trusted")
    .eq("ghost_profile_id", ghostProfileId)
    .eq("device_id", deviceId)
    .maybeSingle();

  return data?.trusted ?? false;
}

export async function getGhostDevices(ghostProfileId: string) {
  const { data, error } = await supabase
    .from("ghost_device_identities")
    .select("*")
    .eq("ghost_profile_id", ghostProfileId)
    .order("last_seen_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function revokeDevice(deviceIdentityId: string, ghostProfileId: string) {
  const { error } = await supabase
    .from("ghost_device_identities")
    .delete()
    .eq("id", deviceIdentityId)
    .eq("ghost_profile_id", ghostProfileId);

  if (error) throw error;
  console.log("[ghost] device_revoked", { deviceIdentityId });
  await logGhostAudit(ghostProfileId, "device_revoked", "warn", `Device ${deviceIdentityId} revoked`);
}

// ─── Audit Helper ────────────────────────────────────────

async function logGhostAudit(
  ghostProfileId: string,
  eventType: string,
  severity: "info" | "warn" | "critical",
  detail: string
) {
  await supabase.from("ghost_audit_minimal").insert({
    ghost_profile_id: ghostProfileId,
    event_type: eventType,
    severity,
    minimal_detail: detail,
  }).then(({ error }) => {
    if (error) console.warn("[ghost] audit_log_failed", error);
  });
}

export { logGhostAudit, getDeviceId };
