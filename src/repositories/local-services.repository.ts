/**
 * local-services.repository — DB operations for LocalServices page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchLocalServicesData(orgId: string) {
  const [{ data: svc }, { data: props }, { data: org }] = await Promise.all([
    supabase.from("local_services").select("*").eq("org_id", orgId).order("sort_order"),
    supabase.from("properties").select("id, label, city, country").eq("org_id", orgId).order("label"),
    supabase.from("orgs").select("local_services_enabled").eq("id", orgId).single(),
  ]);
  return { services: svc || [], properties: props || [], featureEnabled: org?.local_services_enabled || false };
}

export async function toggleLocalServicesFeature(orgId: string, enabled: boolean) {
  await supabase.from("orgs").update({ local_services_enabled: enabled } as any).eq("id", orgId);
}

export async function upsertLocalService(editingId: string | null, payload: Record<string, any>) {
  if (editingId) {
    await (supabase as any).from("local_services").update(payload).eq("id", editingId);
  } else {
    await (supabase as any).from("local_services").insert(payload);
  }
}

export async function deleteLocalService(id: string) {
  await supabase.from("local_services").delete().eq("id", id);
}
