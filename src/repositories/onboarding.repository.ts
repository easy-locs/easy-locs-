/**
 * onboarding.repository — All DB operations for onboarding wizard.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchOnboardingProgress(userId: string) {
  const { data } = await supabase.from("profiles").select("onboarding_step, country, user_type").eq("id", userId).single();
  return data;
}

export async function saveOnboardingStep(userId: string, step: number) {
  await supabase.from("profiles").update({ onboarding_step: step }).eq("id", userId);
}

export async function updateProfileCountryAndType(userId: string, fields: Record<string, any>) {
  await supabase.from("profiles").update(fields).eq("id", userId);
}

export async function completeOnboarding(userId: string) {
  await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 7 }).eq("id", userId);
}

export async function fetchUserOrg(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
  return data;
}

export async function createOrgForUser(userId: string, orgName = "Mon organisation") {
  const newOrgId = crypto.randomUUID();
  await supabase.from("orgs").insert({ id: newOrgId, owner_user_id: userId, name: orgName });
  await supabase.from("org_members").insert({ org_id: newOrgId, user_id: userId, role: "owner" });
  await supabase.from("subscriptions").insert({
    user_id: userId, plan: "trial", status: "trialing",
    trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  });
  return newOrgId;
}

export async function insertOwnerProfile(userId: string, orgId: string, ownerForm: Record<string, any>, country: string) {
  const { error } = await supabase.from("owner_profiles").insert({
    user_id: userId, org_id: orgId, ...ownerForm, country,
  });
  if (error) throw error;
}

export async function insertProperty(orgId: string, userId: string, propertyForm: Record<string, any>, country: string, rentalMode: string) {
  const { data, error } = await (supabase as any).from("properties").insert({
    org_id: orgId, user_id: userId, country, ...propertyForm, rental_mode: rentalMode,
  }).select("id").single();
  if (error) throw error;
  return data?.id ?? null;
}

export async function insertTenantOnboarding(orgId: string, userId: string, propertyId: string | null, tenantForm: Record<string, any>) {
  const { error } = await (supabase as any).from("tenants").insert({
    org_id: orgId, user_id: userId, property_id: propertyId, ...tenantForm,
  });
  if (error) throw error;
}

export async function upsertOtaConnection(orgId: string, userId: string, provider: string, propertyId: string) {
  await supabase.from("ota_connections").upsert({
    org_id: orgId, user_id: userId, provider, status: "active", linked_properties: [propertyId],
  }, { onConflict: "id" });
}

export async function syncIcal(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("sync-ical", { body });
  if (error) throw error;
  return data;
}
