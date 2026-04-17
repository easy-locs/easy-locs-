/**
 * dynamic-pricing.repository — All DB operations for DynamicPricing page.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchOrgForUser(userId: string) {
  const { data } = await cFrom("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!data) return null;
  const { data: o } = await cFrom("orgs").select("*").eq("id", data.org_id).single();
  return o;
}

export async function fetchSeasonalProperties(orgId: string) {
  const { data } = await cFrom("properties").select("id, label, monthly_rent").eq("org_id", orgId).eq("rental_mode", "seasonal");
  return data || [];
}

export async function fetchPricingRules(orgId: string) {
  const { data } = await cFrom("pricing_rules").select("*").eq("org_id", orgId).order("priority", { ascending: false });
  return (data || []) as any[];
}

export async function fetchListings(orgId: string) {
  const { data } = await cFrom("public_listings").select("id, property_id, price_per_night, title").eq("org_id", orgId);
  return data || [];
}

export async function fetchReservations(orgId: string) {
  const { data } = await cFrom("reservations").select("*").eq("org_id", orgId);
  return (data || []) as any[];
}

export async function addPricingRule(orgId: string, userId: string, rule: {
  rule_type: string; name: string; adjustment_type: string;
  adjustment_value: number; start_date: string | null; end_date: string | null;
  property_id: string;
}) {
  const { error } = await cFrom("pricing_rules").insert({
    org_id: orgId, user_id: userId, ...rule,
  });
  if (error) throw error;
}

export async function togglePricingRule(id: string, active: boolean) {
  const { error } = await cFrom("pricing_rules").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deletePricingRule(id: string) {
  const { error } = await cFrom("pricing_rules").delete().eq("id", id);
  if (error) throw error;
}
