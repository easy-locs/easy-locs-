/**
 * Profile Repository — Global profile load/save operations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchBaseProfile(userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function fetchOwnerProfile(orgId: string) {
  const { data } = await supabase.from("owner_profiles").select("*").eq("org_id", orgId).limit(1).maybeSingle();
  return data;
}

export async function fetchTenantProfile(userId: string) {
  const { data } = await supabase.from("tenants").select("*").eq("tenant_user_id", userId).limit(1).maybeSingle();
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, any>) {
  await supabase.from("profiles").update(updates as any).eq("id", userId);
}

export async function upsertOwnerProfile(payload: Record<string, any>) {
  await supabase.from("owner_profiles").upsert(payload, { onConflict: "org_id" });
}

export async function createOrg(name: string, ownerUserId: string, email: string) {
  const { data, error } = await supabase.from("orgs").insert({ name, owner_user_id: ownerUserId, email }).select("id").single();
  if (error) throw error;
  return data;
}

export async function addOrgMember(orgId: string, userId: string, role: string) {
  await supabase.from("org_members").insert({ org_id: orgId, user_id: userId, role });
}
