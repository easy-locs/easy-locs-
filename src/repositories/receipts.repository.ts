/**
 * receipts.repository — DB operations for Receipts page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchReceipts(orgId: string, countryFilter?: string | null) {
  let query = supabase
    .from("documents")
    .select("id, title, doc_type, data_json, created_at")
    .eq("org_id", orgId)
    .eq("doc_type", "rent-receipt");
  if (countryFilter) query = query.eq("country", countryFilter);
  const { data } = await query.order("created_at", { ascending: false });
  return data || [];
}

export async function fetchProfileSignature(userId: string) {
  const { data } = await supabase.from("profiles").select("signature_url, name").eq("id", userId).single();
  return data;
}

export async function fetchOrgStamp(orgId: string) {
  const { data } = await supabase.from("orgs").select("stamp_url").eq("id", orgId).single();
  return (data as any)?.stamp_url || null;
}

export async function fetchOwnerProfile(orgId: string) {
  const { data } = await supabase.from("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).single();
  return data;
}
