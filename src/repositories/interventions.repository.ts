/**
 * interventions.repository — DB operations for Interventions page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchPropertiesForOrg(orgId: string, countryFilter?: string | null) {
  let q = supabase.from("properties").select("id, label, country").eq("org_id", orgId).order("label");
  if (countryFilter) q = q.eq("country", countryFilter);
  const { data } = await q;
  return data || [];
}

export async function fetchInterventions(orgId: string, propIds?: string[]) {
  let q = supabase.from("interventions").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (propIds && propIds.length > 0) q = q.in("property_id", propIds);
  const { data } = await q;
  return (data || []) as any[];
}

export async function fetchTenantsForOrg(orgId: string) {
  const { data } = await supabase.from("tenants").select("id, name, property_id").eq("org_id", orgId).order("name");
  return data || [];
}

export async function insertIntervention(record: Record<string, any>) {
  const { data, error } = await supabase.from("interventions").insert(record).select().single();
  if (error) throw error;
  return data;
}

export async function updateIntervention(id: string, record: Record<string, any>) {
  const { error } = await supabase.from("interventions").update(record).eq("id", id);
  if (error) throw error;
}

export async function deleteIntervention(id: string) {
  const { error } = await supabase.from("interventions").delete().eq("id", id);
  if (error) throw error;
}

export function subscribeInterventions(orgId: string, onUpdate: () => void) {
  const channel = supabase
    .channel("interventions-rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "interventions", filter: `org_id=eq.${orgId}` }, onUpdate)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
