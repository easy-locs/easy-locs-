/**
 * property-hub.repository — All DB operations for PropertyDetailHub page.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function fetchPropertyHubData(propertyId: string, orgId: string) {
  const [
    { data: prop }, { data: ten }, { data: rents }, { data: leasesData },
    { data: exp }, { data: intv }, { data: inv }, { data: seasonal }, { data: realEstate },
  ] = await Promise.all([
    db("properties").select("*").eq("id", propertyId).eq("org_id", orgId).single(),
    db("tenants").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("name"),
    db("rent_calls").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("month", { ascending: false }).limit(24),
    db("leases").select("id").eq("org_id", orgId).eq("property_id", propertyId),
    db("expenses").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("expense_date", { ascending: false }).limit(20),
    db("interventions").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("created_at", { ascending: false }).limit(20),
    db("inventory_reports").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("report_date", { ascending: false }),
    db("public_listings").select("*").eq("org_id", orgId).eq("property_id", propertyId),
    db("real_estate_listings").select("*").eq("org_id", orgId).eq("property_id", propertyId),
  ]);

  const leaseIds = (leasesData || []).map((l: any) => l.id);
  let documents: any[] = [];
  if (leaseIds.length > 0) {
    const { data: docs } = await db("documents").select("*").eq("org_id", orgId)
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
