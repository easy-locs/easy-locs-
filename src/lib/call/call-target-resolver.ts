/**
 * call-target-resolver — Atomic unit: resolve a raw target ID to a callable user ID.
 * Single responsibility: identity resolution for calls.
 * Extracted from CallProvider.resolveReceiverUserId.
 */
import { supabase } from "@/integrations/supabase/client";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[CALL][${step}] ${phase}:`, payload ?? {});
};

export async function resolveCallTarget(rawTargetId: string, callerUserId: string): Promise<string> {
  trace("target.resolve", "input", { rawTargetId, callerUserId });
  const normalized = rawTargetId.trim();
  if (!normalized) {
    trace("target.resolve", "error", { reason: "empty_target" });
    return "";
  }

  // 1. Direct profile lookup (user UUID)
  const { data: directProfile } = await supabase
    .from("profiles").select("id").eq("id", normalized).maybeSingle();
  if (directProfile?.id && directProfile.id !== callerUserId) {
    trace("target.resolve", "output", { strategy: "direct_profile", resolved: directProfile.id });
    return directProfile.id;
  }

  // 2. orbit_profiles_v2 by orbit_id
  if (normalized.startsWith("orbit_")) {
    const { data: orbitProfile } = await (supabase as any)
      .from("orbit_profiles_v2").select("id").eq("orbit_id", normalized).maybeSingle();
    if (orbitProfile?.id && orbitProfile.id !== callerUserId) {
      trace("target.resolve", "output", { strategy: "orbit_id", resolved: orbitProfile.id });
      return orbitProfile.id;
    }
  }

  // 3. orbit_profiles_v2 by user id
  const { data: orbitByUserId } = await (supabase as any)
    .from("orbit_profiles_v2").select("id").eq("id", normalized).maybeSingle();
  if (orbitByUserId?.id && orbitByUserId.id !== callerUserId) {
    trace("target.resolve", "output", { strategy: "orbit_user_id", resolved: orbitByUserId.id });
    return orbitByUserId.id;
  }

  // 4. org owner
  const { data: ownerMembership } = await supabase
    .from("org_members").select("user_id, role").eq("org_id", normalized).eq("role", "owner").limit(1).maybeSingle();
  if (ownerMembership?.user_id && ownerMembership.user_id !== callerUserId) {
    trace("target.resolve", "output", { strategy: "org_owner", resolved: ownerMembership.user_id });
    return ownerMembership.user_id;
  }

  // 5. orgs.owner_user_id
  const { data: org } = await supabase
    .from("orgs").select("owner_user_id").eq("id", normalized).maybeSingle();
  if (org?.owner_user_id && org.owner_user_id !== callerUserId) {
    trace("target.resolve", "output", { strategy: "orgs_owner", resolved: org.owner_user_id });
    return org.owner_user_id;
  }

  // 6. Fallback: any other member
  const { data: otherMembers } = await supabase
    .from("org_members").select("user_id").eq("org_id", normalized).neq("user_id", callerUserId).limit(1).maybeSingle();
  if (otherMembers?.user_id) {
    trace("target.resolve", "output", { strategy: "org_member", resolved: otherMembers.user_id });
    return otherMembers.user_id;
  }

  trace("target.resolve", "error", { reason: "all_strategies_exhausted", rawTargetId });
  return "";
}
