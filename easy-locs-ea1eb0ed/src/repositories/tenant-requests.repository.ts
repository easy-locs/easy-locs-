/**
 * tenant-requests.repository — Tenant request resolution + notification.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function resolveDocumentRequest(requestId: string) {
  const { error } = await db("document_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() } as any)
    .eq("id", requestId);
  if (error) throw error;
}

export async function fetchTenantUserId(tenantId: string) {
  const { data } = await db("tenants").select("tenant_user_id").eq("id", tenantId).single();
  return data?.tenant_user_id as string | null;
}

export async function insertTenantNotification(payload: Record<string, any>) {
  await db("app_notifications").insert(payload);
}
