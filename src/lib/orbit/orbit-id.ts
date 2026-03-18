/**
 * Orbit ID — Decentralized identity layer for the Easy-Locs super-app.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateOrbitIdentity(params: {
  userId: string;
  workspaceId?: string;
  displayName?: string;
}) {
  const { data: existing } = await supabase
    .from("orbit_identity_profiles")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existing) return existing;

  const publicHandle = `orbit_${params.userId.replace(/-/g, "").slice(0, 12)}`;

  const { data, error } = await supabase
    .from("orbit_identity_profiles")
    .insert({
      user_id: params.userId,
      workspace_id: params.workspaceId ?? null,
      public_handle: publicHandle,
      display_name: params.displayName ?? "Orbit User",
      anonymity_mode: false,
      discoverable: true,
      verification_level: "basic",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrbitPrivacy(params: {
  identityId: string;
  anonymityMode?: boolean;
  discoverable?: boolean;
  displayName?: string;
}) {
  const payload: Record<string, any> = {};
  if (typeof params.anonymityMode === "boolean") payload.anonymity_mode = params.anonymityMode;
  if (typeof params.discoverable === "boolean") payload.discoverable = params.discoverable;
  if (typeof params.displayName === "string") payload.display_name = params.displayName;

  const { data, error } = await supabase
    .from("orbit_identity_profiles")
    .update(payload)
    .eq("id", params.identityId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function registerOrbitDeviceKey(params: {
  identityId: string;
  deviceLabel?: string;
  publicKey: string;
  algo?: string;
}) {
  const { data, error } = await supabase
    .from("orbit_device_keys")
    .insert({
      identity_id: params.identityId,
      device_label: params.deviceLabel ?? "Unknown device",
      public_key: params.publicKey,
      key_algo: params.algo ?? "x25519",
      is_active: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
