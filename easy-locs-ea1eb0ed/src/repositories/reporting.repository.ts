import { supabase } from "@/integrations/supabase/client";

export async function fetchReportingData(orgId: string, countryFilter?: string | null) {
  let propQ = supabase.from("properties").select("id, label, country").eq("org_id", orgId);
  if (countryFilter) propQ = propQ.eq("country", countryFilter);
  const [{ data: props }, { data: rc }, { data: exp }] = await Promise.all([
    propQ,
    supabase.from("rent_calls").select("month, rent_amount, charges_amount, total_amount, paid, property_id").eq("org_id", orgId),
    supabase.from("expenses").select("label, amount, category, expense_date, property_id").eq("org_id", orgId),
  ]);
  const p = (props || []) as Array<{ id: string; label: string; country: string }>;
  const pIds = new Set(p.map(pr => pr.id));
  return {
    properties: p,
    rentCalls: countryFilter ? (rc || []).filter((r: any) => r.property_id && pIds.has(r.property_id)) : (rc || []),
    expenses: countryFilter ? (exp || []).filter((e: any) => e.property_id && pIds.has(e.property_id)) : (exp || []),
  };
}
