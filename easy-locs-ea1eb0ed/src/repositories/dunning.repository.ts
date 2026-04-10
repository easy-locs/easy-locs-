/**
 * dunning.repository — All DB operations for DunningLetters page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchDunningData(orgId: string, countryFilter: string | null) {
  let propQuery = supabase.from("properties").select("id, label, address, city, country").eq("org_id", orgId);
  if (countryFilter) propQuery = propQuery.eq("country", countryFilter);
  const { data: props } = await propQuery;
  const filteredProps = (props || []) as any[];
  const propIds = filteredProps.map((p: any) => p.id);

  const { data: allTenants } = await supabase.from("tenants").select("id, name, property_id").eq("org_id", orgId);
  let tenants = (allTenants || []) as any[];
  if (countryFilter) {
    const propIdSet = new Set(propIds);
    tenants = tenants.filter((t: any) => t.property_id && propIdSet.has(t.property_id));
  }
  const tenantIds = tenants.map((t: any) => t.id);

  let letters: any[] = [];
  let unpaid: any[] = [];

  if (tenantIds.length > 0) {
    const [{ data: d }, { data: r }] = await Promise.all([
      supabase.from("dunning_letters").select("*").eq("org_id", orgId).in("tenant_id", tenantIds).order("created_at", { ascending: false }),
      supabase.from("rent_calls").select("id, tenant_id, month, total_amount, paid").eq("org_id", orgId).eq("paid", false).in("tenant_id", tenantIds),
    ]);
    letters = d || [];
    unpaid = r || [];
  } else if (!countryFilter) {
    const [{ data: d }, { data: r }] = await Promise.all([
      supabase.from("dunning_letters").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("rent_calls").select("id, tenant_id, month, total_amount, paid").eq("org_id", orgId).eq("paid", false),
    ]);
    letters = d || [];
    unpaid = r || [];
  }

  return { properties: filteredProps, tenants, letters, unpaid };
}

export async function createDunningLetter(orgId: string, tenantId: string, propertyId: string | null, level: number, month: string, amount: number) {
  const { error } = await supabase.from("dunning_letters").insert({
    org_id: orgId, tenant_id: tenantId, property_id: propertyId, level, month, amount_due: amount,
  });
  if (error) throw error;
}

export async function sendDunningEmail(tenantId: string, subject: string, html: string) {
  const { data } = await supabase.from("tenants").select("email").eq("id", tenantId).single();
  if (data?.email) {
    await supabase.functions.invoke("send-email", { body: { to: data.email, subject, html } }).catch(() => {});
  }
}
