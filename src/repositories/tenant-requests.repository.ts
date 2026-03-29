/**
 * tenant-requests.repository — Tenant request resolution + notification.
 */
import { supabase } from "@/integrations/supabase/client";

export async function resolveDocumentRequest(requestId: string) {
  const { error } = await supabase.from("document_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() } as any)
    .eq("id", requestId);
  if (error) throw error;
}

export async function fetchTenantUserId(tenantId: string) {
  const { data } = await supabase.from("tenants").select("tenant_user_id").eq("id", tenantId).single();
  return data?.tenant_user_id as string | null;
}

export async function insertTenantNotification(payload: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(payload);
}
