import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchLeases(orgId: string, countryFilter?: string | null) {
  let query = cFrom("leases")
    .select("*, tenants(name, email), properties(label, address, city, country)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (countryFilter) query = query.eq("country", countryFilter);
  const { data } = await query;
  return data || [];
}

export async function sendLeaseForSignature(leaseId: string) {
  const { error } = await cFrom("leases").update({ status: "pending_signature" }).eq("id", leaseId);
  if (error) throw error;
}
