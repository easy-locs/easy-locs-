/**
 * data-import.repository — DB operations for DataImport page.
 * Optimized: batch inserts for ultra-fast CSV imports.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function insertProperty(record: Record<string, any>) {
  const { error } = await cFrom("properties").insert(record);
  if (error) throw error;
}

export async function insertPropertiesBatch(records: Record<string, any>[]) {
  const { error } = await cFrom("properties").insert(records);
  if (error) throw error;
  return records.length;
}

export async function insertTenant(record: Record<string, any>) {
  const { error } = await cFrom("tenants").insert(record);
  if (error) throw error;
}

export async function insertTenantsBatch(records: Record<string, any>[]) {
  const { error } = await cFrom("tenants").insert(records);
  if (error) throw error;
  return records.length;
}

export async function fetchTenantNames(orgId: string) {
  const { data } = await cFrom("tenants").select("id, name").eq("org_id", orgId);
  return data || [];
}

export async function upsertRentCall(record: Record<string, any>) {
  const { error } = await cFrom("rent_calls").upsert(record, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
  if (error) throw error;
}

export async function upsertRentCallsBatch(records: Record<string, any>[]) {
  const { error } = await cFrom("rent_calls").upsert(records, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
  if (error) throw error;
  return records.length;
}
