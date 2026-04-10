/**
 * dynamic-pricing.repository — All DB operations for DynamicPricing page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchOrgForUser(userId: string) {
  const { data } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!data) return null;
  const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
  return o;
}

export async function fetchSeasonalProperties(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, monthly_rent").eq("org_id", orgId).eq("rental_mode", "seasonal");
  return data || [];
}

export async function fetchPricingRules(orgId: string) {
  const { data } = await supabase.from("pricing_rules" as any).select("*").eq("org_id", orgId).order("priority", { ascending: false });
  return (data || []) as any[];
}

export async function fetchListings(orgId: string) {
  const { data } = await supabase.from("public_listings").select("id, property_id, price_per_night, title").eq("org_id", orgId);
  return data || [];
}

export async function fetchReservations(orgId: string) {
  const { data } = await supabase.from("reservations" as any).select("*").eq("org_id", orgId);
  return (data || []) as any[];
}

export async function addPricingRule(orgId: string, userId: string, rule: {
  rule_type: string; name: string; adjustment_type: string;
  adjustment_value: number; start_date: string | null; end_date: string | null;
  property_id: string;
}) {
  const { error } = await supabase.from("pricing_rules" as any).insert({
    org_id: orgId, user_id: userId, ...rule,
  });
  if (error) throw error;
}

export async function togglePricingRule(id: string, active: boolean) {
  const { error } = await supabase.from("pricing_rules" as any).update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deletePricingRule(id: string) {
  const { error } = await supabase.from("pricing_rules" as any).delete().eq("id", id);
  if (error) throw error;
}
