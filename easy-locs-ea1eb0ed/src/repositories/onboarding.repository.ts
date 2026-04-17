/**
 * onboarding.repository — All DB operations for onboarding wizard.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchOnboardingProgress(userId: string) {
  const { data } = await cFrom("profiles").select("onboarding_step, country, user_type").eq("id", userId).single();
  return data;
}

export async function saveOnboardingStep(userId: string, step: number) {
  await cFrom("profiles").update({ onboarding_step: step }).eq("id", userId);
}

export async function updateProfileCountryAndType(userId: string, fields: Record<string, any>) {
  await cFrom("profiles").update(fields).eq("id", userId);
}

export async function completeOnboarding(userId: string) {
  await cFrom("profiles").update({ onboarding_completed: true, onboarding_step: 7 }).eq("id", userId);
}

export async function fetchUserOrg(userId: string) {
  const { data } = await cFrom("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
  return data;
}

export async function createOrgForUser(userId: string, orgName = "Mon organisation") {
  const newOrgId = crypto.randomUUID();
  await cFrom("orgs").insert({ id: newOrgId, owner_user_id: userId, name: orgName });
  await cFrom("org_members").insert({ org_id: newOrgId, user_id: userId, role: "owner" });
  await cFrom("subscriptions").insert({
    user_id: userId, plan: "trial", status: "trialing",
    trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  });
  return newOrgId;
}

export async function insertOwnerProfile(userId: string, orgId: string, ownerForm: Record<string, any>, country: string) {
  const { error } = await cFrom("owner_profiles").insert({
    user_id: userId, org_id: orgId, ...ownerForm, country,
  });
  if (error) throw error;
}

export async function insertProperty(orgId: string, userId: string, propertyForm: Record<string, any>, country: string, rentalMode: string) {
  const { data, error } = await cFrom("properties").insert({
    org_id: orgId, user_id: userId, country, ...propertyForm, rental_mode: rentalMode,
  }).select("id").single();
  if (error) throw error;
  return data?.id ?? null;
}

export async function insertTenantOnboarding(orgId: string, userId: string, propertyId: string | null, tenantForm: Record<string, any>) {
  const { error } = await cFrom("tenants").insert({
    org_id: orgId, user_id: userId, property_id: propertyId, ...tenantForm,
  });
  if (error) throw error;
}

export async function upsertOtaConnection(orgId: string, userId: string, provider: string, propertyId: string) {
  await cFrom("ota_connections").upsert({
    org_id: orgId, user_id: userId, provider, status: "active", linked_properties: [propertyId],
  }, { onConflict: "id" });
}

export async function syncIcal(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("sync-ical", { body });
  if (error) throw error;
  return data;
}
