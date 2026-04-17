import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchOrgForUser(userId: string) {
  const { data } = await cFrom("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!data) return null;
  const { data: o } = await cFrom("orgs").select("*").eq("id", data.org_id).single();
  return o;
}

export async function fetchPropertiesForOrg(orgId: string, countryFilter?: string | null) {
  let query = cFrom("properties").select("id, label, country, monthly_rent, monthly_charges").eq("org_id", orgId);
  if (countryFilter) query = query.eq("country", countryFilter);
  const { data } = await query;
  return data || [];
}

export async function fetchJournal(orgId: string) {
  const { data } = await cFrom("transaction_journal").select("*").eq("org_id", orgId).order("transaction_date", { ascending: false }).limit(500);
  return (data || []) as unknown as Array<{
    id: string; label: string; category: string; debit: number; credit: number;
    transaction_date: string; currency: string; notes: string; source_type: string;
    property_id: string | null; created_at: string;
  }>;
}

export async function fetchRentCalls(orgId: string) {
  const { data } = await cFrom("rent_calls").select("*").eq("org_id", orgId).eq("paid", true);
  return data || [];
}

export async function fetchAllExpenses(orgId: string) {
  const { data } = await cFrom("expenses").select("*").eq("org_id", orgId);
  return data || [];
}

export async function insertJournalEntry(entry: {
  org_id: string; user_id: string; label: string; category: string;
  debit: number; credit: number; transaction_date: string; notes: string;
  property_id: string | null; source_type: string; currency: string;
}) {
  const { error } = await cFrom("transaction_journal").insert(entry);
  if (error) throw error;
}
