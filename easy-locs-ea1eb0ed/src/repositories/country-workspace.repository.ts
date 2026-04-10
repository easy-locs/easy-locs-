/**
 * country-workspace.repository — DB operations for CountryWorkspace page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchCountryStats(orgId: string, country: string) {
  const [props, tenants, docs, buildings, inventories, furniture] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact" }).eq("org_id", orgId).eq("country", country),
    supabase.from("tenants").select("id, property_id, lease_start").eq("org_id", orgId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("country", country),
    supabase.from("buildings").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("inventory_reports").select("id, property_id").eq("org_id", orgId),
    supabase.from("furniture_items").select("id, property_id").eq("org_id", orgId),
  ]);
  const propIds = new Set((props.data || []).map(p => p.id));
  const countryTenants = (tenants.data || []).filter(t => t.property_id && propIds.has(t.property_id));
  const countryLeases = countryTenants.filter(t => t.lease_start);
  const countryInventories = (inventories.data || []).filter(i => i.property_id && propIds.has(i.property_id));
  const countryFurniture = (furniture.data || []).filter(f => f.property_id && propIds.has(f.property_id));

  return {
    properties: props.count || 0,
    tenants: countryTenants.length,
    leases: countryLeases.length,
    documents: docs.count || 0,
    buildings: buildings.count || 0,
    inventories: countryInventories.length,
    furniture: countryFurniture.length,
  };
}
