/**
 * property-hub.repository — All DB operations for PropertyDetailHub page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchPropertyHubData(propertyId: string, orgId: string) {
  const [
    { data: prop }, { data: ten }, { data: rents }, { data: leasesData },
    { data: exp }, { data: intv }, { data: inv }, { data: seasonal }, { data: realEstate },
  ] = await Promise.all([
    supabase.from("properties").select("*").eq("id", propertyId).eq("org_id", orgId).single(),
    supabase.from("tenants").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("name"),
    supabase.from("rent_calls").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("month", { ascending: false }).limit(24),
    supabase.from("leases").select("id").eq("org_id", orgId).eq("property_id", propertyId),
    supabase.from("expenses").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("expense_date", { ascending: false }).limit(20),
    supabase.from("interventions").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("created_at", { ascending: false }).limit(20),
    supabase.from("inventory_reports").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("report_date", { ascending: false }),
    supabase.from("public_listings").select("*").eq("org_id", orgId).eq("property_id", propertyId),
    supabase.from("real_estate_listings").select("*").eq("org_id", orgId).eq("property_id", propertyId),
  ]);

  const leaseIds = (leasesData || []).map((l: any) => l.id);
  let documents: any[] = [];
  if (leaseIds.length > 0) {
    const { data: docs } = await supabase.from("documents").select("*").eq("org_id", orgId)
      .in("lease_id", leaseIds).order("created_at", { ascending: false }).limit(50);
    documents = docs || [];
  }

  return {
    property: prop,
    tenants: ten || [],
    rentCalls: rents || [],
    leases: leasesData || [],
    expenses: exp || [],
    interventions: intv || [],
    inventories: inv || [],
    seasonalListings: seasonal || [],
    realEstateListings: realEstate || [],
    documents,
  };
}
