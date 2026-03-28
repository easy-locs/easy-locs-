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
