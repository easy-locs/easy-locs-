/**
 * settings.repository — All DB operations for Settings page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchProfile(userId: string) {
  const { data } = await supabase.from("profiles").select("name, email, country, locale, signature_url").eq("id", userId).single();
  return data;
}

export async function updateProfile(userId: string, updates: { name: string; country: string; locale: string; signature_url: string }) {
  await supabase.from("profiles").update(updates as any).eq("id", userId);
}

export async function fetchOrg(orgId: string) {
  const { data } = await supabase.from("orgs").select("name, address, postal_code, city, phone, siret, email, logo_url, stamp_url, brand_name, brand_primary_color, brand_accent_color").eq("id", orgId).single();
  return data;
}

export async function updateOrg(orgId: string, updates: Record<string, any>) {
  await supabase.from("orgs").update(updates as any).eq("id", orgId);
}

export async function uploadLogo(orgId: string, file: File): Promise<string> {
  const path = `${orgId}/logo-${Date.now()}.${file.name.split(".").pop()}`;
  const { error } = await supabase.storage.from("rental-docs").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl || path;
}

export async function exportUserData(userId: string) {
  const tables = ["profiles", "wallet_transactions", "documents", "leases", "tenants", "properties"];
  const allData: Record<string, unknown[]> = {};
  for (const table of tables) {
    const { data } = await supabase.from(table as any).select("*").or(`user_id.eq.${userId},owner_user_id.eq.${userId}`).limit(1000);
    if (data?.length) allData[table] = data;
  }
  return allData;
}

export async function updateOrgBranding(orgId: string, branding: { brand_name: string | null; brand_primary_color: string | null; brand_accent_color: string | null }) {
  await supabase.from("orgs").update(branding as any).eq("id", orgId);
}

export async function requestAccountDeletion(userId: string, email: string) {
  await supabase.from("audit_logs").insert({
    user_id: userId, action: "account_deletion_requested",
    metadata_json: { email, requested_at: new Date().toISOString() },
  });
}

// ── Orbit locale/currency ──
export async function fetchProfileLocale(userId: string) {
  const { data } = await supabase.from("profiles").select("locale, currency").eq("id", userId).single();
  return data;
}

export async function updateProfileField(userId: string, field: string, value: any) {
  await supabase.from("profiles").update({ [field]: value } as any).eq("id", userId);
}

// ── Payments / Providers ──
export async function fetchOrgPaymentConfig(orgId: string) {
  const { data } = await supabase.from("orgs").select("stripe_account_id, stripe_onboarding_complete, country, currency").eq("id", orgId).single();
  return data;
}

export async function invokeStripeOnboarding(orgId: string) {
  const { data, error } = await supabase.functions.invoke("create-connect-account", { body: { org_id: orgId } });
  if (error) throw error;
  return data;
}

export async function fetchStripeLoginLink(orgId: string) {
  const { data, error } = await supabase.functions.invoke("stripe-login-link", { body: { org_id: orgId } });
  if (error) throw error;
  return data;
}

// ── MFA ──
export async function enrollMFA() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  return data;
}

export async function challengeMFA(factorId: string) {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data;
}

export async function verifyMFA(factorId: string, challengeId: string, code: string) {
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw error;
}

export async function unenrollMFA(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

// ── Notification preferences ──
export async function upsertNotificationPreferences(prefs: Record<string, any>) {
  const { error } = await supabase.from("notification_preferences").upsert(prefs as any, { onConflict: "user_id" });
  if (error) throw error;
}

// ── Security ──
export async function fetchSecuritySettings(userId: string) {
  const { data } = await supabase.from("profiles").select("wallet_pin_hash, face_id_enabled, login_2fa_enabled, biometric_enabled").eq("id", userId).single();
  return data;
}

export async function updateSecuritySetting(userId: string, column: string, value: any) {
  const { error } = await supabase.from("profiles").update({ [column]: value } as any).eq("id", userId);
  if (error) throw error;
}

// ── Auth ──
export async function signOut() {
  await supabase.auth.signOut();
}

export async function getAuthUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// ── Data export by table ──
export async function exportTableData(userId: string, table: string) {
  const { data } = await supabase.from(table as any).select("*").or(`user_id.eq.${userId},owner_user_id.eq.${userId}`).limit(2000);
  return data || [];
}

export async function deleteUserAccount(userId: string) {
  const { error } = await supabase.rpc("delete_user_account" as any, { target_user_id: userId });
  if (error) throw error;
}

// ── Roles check ──
export async function hasRole(userId: string, role: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
  return !!data;
}

// ── Permission bootstrap ──
export async function fetchPermissions(userId: string) {
  const [adminRes, ownerRes] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);
  return { isAdmin: !!adminRes.data, isOwner: !!ownerRes.data };
}

// ── Onboarding checklist ──
export async function fetchOnboardingCounts(orgId: string) {
  const [p, t, d, l, m] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("leases").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ]);
  return {
    properties: p.count || 0,
    tenants: t.count || 0,
    documents: d.count || 0,
    leases: l.count || 0,
    members: m.count || 0,
  };
}

// ── Ensure org ──
export async function fetchUserOrg(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
  return data?.org_id ?? null;
}

export async function createOrg(userId: string, name: string) {
  const { data, error } = await supabase.from("orgs").insert({ name, owner_user_id: userId } as any).select("id").single();
  if (error) throw error;
  const orgId = data?.id;
  if (orgId) {
    await supabase.from("org_members").insert({ org_id: orgId, user_id: userId, role: "owner" });
  }
  return orgId;
}
