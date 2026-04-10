/**
 * data-import.repository — DB operations for DataImport page.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function insertProperty(record: Record<string, any>) {
  const { error } = await db("properties").insert(record);
  if (error) throw error;
}

export async function insertTenant(record: Record<string, any>) {
  const { error } = await db("tenants").insert(record);
  if (error) throw error;
}

export async function fetchTenantNames(orgId: string) {
  const { data } = await supabase.from("tenants").select("id, name").eq("org_id", orgId);
  return data || [];
}

export async function upsertRentCall(record: Record<string, any>) {
  const { error } = await db("rent_calls").upsert(record, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
  if (error) throw error;
}
