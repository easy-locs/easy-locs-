/**
 * tenant-requests.repository — Tenant request resolution + notification.
 */
import { db } from "@/services/db";

import { ctFrom as cFrom, ctRpc as cRpc } from "@/lib/execution/contacts-mutation";
export async function resolveDocumentRequest(requestId: string) {
  const { error } = await cFrom("document_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() } as any)
    .eq("id", requestId);
  if (error) throw error;
}

export async function fetchTenantUserId(tenantId: string) {
  const { data } = await cFrom("tenants").select("tenant_user_id").eq("id", tenantId).single();
  return data?.tenant_user_id as string | null;
}

export async function insertTenantNotification(payload: Record<string, any>) {
  await cFrom("app_notifications").insert(payload);
}
