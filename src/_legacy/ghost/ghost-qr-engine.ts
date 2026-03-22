/**
 * Ghost QR Engine — Short-lived, encrypted QR targets for ghost identity.
 */
import { supabase } from "@/integrations/supabase/client";
import { getGhostPolicy, GhostTier } from "./ghost-policy";

export type GhostQrType = "contact_invite" | "thread_invite" | "call_invite" | "payment_request";

export async function createGhostQrTarget(params: {
  ghostProfileId: string;
  targetType: GhostQrType;
  encryptedPayload?: string;
  tier: GhostTier;
  maxUses?: number;
}) {
  const policy = getGhostPolicy(params.tier);
  const expiresAt = new Date(Date.now() + policy.qrLifetimeMs).toISOString();

  const { data, error } = await supabase
    .from("ghost_qr_targets")
    .insert({
      ghost_profile_id: params.ghostProfileId,
      target_type: params.targetType,
      encrypted_payload: params.encryptedPayload ?? null,
      max_uses: params.maxUses ?? policy.qrMaxUses,
      expires_at: expiresAt,
      active: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] qr_created", { targetCode: data.target_code, type: params.targetType });
  return data;
}

export async function resolveGhostQrTarget(targetCode: string) {
  const { data, error } = await supabase
    .from("ghost_qr_targets")
    .select("*")
    .eq("target_code", targetCode)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    console.warn("[ghost] qr_resolve_failed", { targetCode, reason: "not_found" });
    return { status: "not_found" as const, target: null };
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    console.warn("[ghost] qr_resolve_failed", { targetCode, reason: "expired" });
    return { status: "expired" as const, target: data };
  }

  // Check usage limit
  if (data.use_count >= data.max_uses) {
    console.warn("[ghost] qr_resolve_failed", { targetCode, reason: "max_uses" });
    return { status: "exhausted" as const, target: data };
  }

  // Increment use count
  await supabase
    .from("ghost_qr_targets")
    .update({ use_count: data.use_count + 1 })
    .eq("id", data.id);

  console.log("[ghost] qr_resolved", { targetCode, type: data.target_type });
  return { status: "valid" as const, target: data };
}

export async function deactivateGhostQr(targetId: string) {
  const { error } = await supabase
    .from("ghost_qr_targets")
    .update({ active: false })
    .eq("id", targetId);

  if (error) throw error;
  console.log("[ghost] qr_deactivated", { targetId });
}
