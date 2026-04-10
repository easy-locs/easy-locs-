/**
 * Profile Repository — Global profile load/save operations.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function fetchBaseProfile(userId: string) {
  const { data } = await db("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function fetchOwnerProfile(orgId: string) {
  const { data } = await db("owner_profiles").select("*").eq("org_id", orgId).limit(1).maybeSingle();
  return data;
}

export async function fetchTenantProfile(userId: string) {
  const { data } = await db("tenants").select("*").eq("tenant_user_id", userId).limit(1).maybeSingle();
  return data;
}

const ALLOWED_PROFILE_FIELDS = new Set([
  "name", "email", "phone", "avatar_url", "language", "country", "currency",
  "bio", "website", "company", "address", "city", "zip_code", "timezone",
  "notification_preferences", "theme", "onboarding_completed",
]);

export async function updateProfile(userId: string, updates: Record<string, any>) {
  const safe: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_PROFILE_FIELDS.has(key)) safe[key] = value;
  }
  if (Object.keys(safe).length === 0) return;
  const { error } = await db("profiles").update(safe as any).eq("id", userId);
  if (error) throw error;
}

export async function upsertOwnerProfile(payload: Record<string, any>) {
  const { error } = await db("owner_profiles").upsert(payload, { onConflict: "org_id" });
  if (error) throw error;
}

export async function createOrg(name: string, ownerUserId: string, email: string) {
  const { data, error } = await db("orgs").insert({ name, owner_user_id: ownerUserId, email }).select("id").single();
  if (error) throw error;
  return data;
}

export async function addOrgMember(orgId: string, userId: string, role: string) {
  await db("org_members").insert({ org_id: orgId, user_id: userId, role });
}

/** Fetch peer profile created_at for "member since" display */
export async function fetchPeerProfileCreatedAt(peerId: string): Promise<string | null> {
  const { data, error } = await db("profiles").select("created_at").eq("id", peerId).maybeSingle();
  if (error) {
    console.warn("[profile.repository] peer profile fetch error:", error.message);
    return null;
  }
  return data?.created_at ?? null;
}

/** DB health probe — simple select */
export async function probeDbHealth(): Promise<boolean> {
  const { error } = await db("profiles").select("id").limit(1);
  return !error;
}

/** Fetch org memberships for a user */
export async function fetchUserOrgIds(userId: string): Promise<string[]> {
  const { data } = await db("org_members").select("org_id").eq("user_id", userId).limit(5);
  return data?.map((m) => m.org_id) ?? [];
}

/** Fetch org details by IDs */
export async function fetchOrgsByIds(orgIds: string[]): Promise<{ id: string; name: string }[]> {
  if (orgIds.length === 0) return [];
  const { data } = await db("orgs").select("id, name").in("id", orgIds);
  return data ?? [];
}

/** Fetch critical profile fields for auth hydration */
export async function fetchProfileCriticalFields(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_type, onboarding_completed, country, currency")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/** Fetch dual-role detection data */
export async function fetchDualRoleData(userId: string) {
  const [tenantResult, orgResult] = await Promise.all([
    db("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle(),
    db("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
  ]);
  return { hasTenant: !!tenantResult.data, hasOrg: !!orgResult.data };
}

/** Mark profile onboarding as completed */
export async function markOnboardingCompleted(userId: string) {
  await db("profiles").update({ onboarding_completed: true } as any).eq("id", userId);
}

/** Fetch user's org_id for admin seed page */
export async function fetchUserFirstOrgId(userId: string): Promise<string | null> {
  const { data } = await db("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
  return data?.org_id ?? null;
}
