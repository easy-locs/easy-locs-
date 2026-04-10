import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function fetchPropertyHubOverview(orgId: string) {
  const [props, tenantsRes, rc] = await Promise.all([
    db("properties").select("id, country").eq("org_id", orgId),
    db("tenants").select("id, property_id, lease_end").eq("org_id", orgId),
    db("rent_calls").select("month, paid, total_amount").eq("org_id", orgId),
  ]);
  return {
    properties: (props.data || []) as Array<{ id: string; country: string }>,
    tenants: (tenantsRes.data || []) as Array<{ id: string; property_id: string | null; lease_end: string | null }>,
    rentCalls: (rc.data || []) as Array<{ month: string; paid: boolean; total_amount: number | string }>,
  };
}
