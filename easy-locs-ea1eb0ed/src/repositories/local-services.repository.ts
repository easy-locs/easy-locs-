/**
 * local-services.repository — DB operations for LocalServices page.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchLocalServicesData(orgId: string) {
  const [{ data: svc }, { data: props }, { data: org }] = await Promise.all([
    cFrom("local_services").select("*").eq("org_id", orgId).order("sort_order"),
    cFrom("properties").select("id, label, city, country").eq("org_id", orgId).order("label"),
    cFrom("orgs").select("local_services_enabled").eq("id", orgId).single(),
  ]);
  return { services: svc || [], properties: props || [], featureEnabled: org?.local_services_enabled || false };
}

export async function toggleLocalServicesFeature(orgId: string, enabled: boolean) {
  await cFrom("orgs").update({ local_services_enabled: enabled } as any).eq("id", orgId);
}

export async function upsertLocalService(editingId: string | null, payload: Record<string, any>) {
  if (editingId) {
    await cFrom("local_services").update(payload).eq("id", editingId);
  } else {
    await cFrom("local_services").insert(payload);
  }
}

export async function deleteLocalService(id: string) {
  await cFrom("local_services").delete().eq("id", id);
}
