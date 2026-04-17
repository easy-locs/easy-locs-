/**
 * tenant-docs.repository — All DB operations for TenantDocuments component.
 */
import { db } from "@/services/db";

import { ctFrom as cFrom, ctRpc as cRpc } from "@/lib/execution/contacts-mutation";
export async function fetchTenantDocs(tenantId: string) {
  const { data } = await cFrom("tenant_documents")
    .select("id, doc_type, label, file_url, filename, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchTenantContactInfo(tenantId: string) {
  const { data } = await cFrom("tenants").select("email, tenant_user_id").eq("id", tenantId).single();
  return data;
}

export async function createSignedDocUrl(bucket: string, path: string, expiresIn = 60 * 60 * 24 * 7) {
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function uploadTenantDocument(orgId: string, tenantId: string, docType: string, label: string, file: File, userId: string) {
  const ext = file.name.split(".").pop();
  const path = `${orgId}/tenants/${tenantId}/${docType}_${Date.now()}.${ext}`;
  const { error: uploadErr } = await db.storage.from("rental-docs").upload(path, file);
  if (uploadErr) throw uploadErr;
  const { data: insertedDoc, error: insertErr } = await cFrom("tenant_documents").insert({
    org_id: orgId, tenant_id: tenantId, doc_type: docType, label, file_url: path, filename: file.name, uploaded_by: userId,
  }).select("id").single();
  if (insertErr) throw insertErr;

  if (insertedDoc?.id) {
    const { data: tenant } = await cFrom("tenants").select("user_id").eq("id", tenantId).maybeSingle();
    if (tenant?.user_id && tenant.user_id !== userId) {
      const { dispatchMultiChannel } = await import("@/lib/notifications/notification-dispatcher");
      dispatchMultiChannel({
        userId: tenant.user_id,
        eventType: "document_ready",
        title: "Document Ready",
        body: `${label} is available for review`,
        channels: ["in_app", "push"],
        priority: "normal",
        entityId: insertedDoc.id,
        entityType: "document",
        dedupeKey: `document_ready_${insertedDoc.id}`,
        data: { domain: "real_estate", document_name: label, document_type: docType },
      }).catch(() => {});
    }
  }
}

export async function validateTenantDoc(docId: string, status: "validated" | "rejected") {
  await cFrom("tenant_documents").update({ status }).eq("id", docId);
}

export async function deleteTenantDoc(docId: string) {
  const { error } = await cFrom("tenant_documents").delete().eq("id", docId);
  if (error) throw error;
}

export { insertChatMessage } from "@/repositories/communication.repository";

export async function insertAppNotificationForTenant(record: Record<string, any>) {
  await cFrom("app_notifications").insert(record);
}

export async function invokeSendEmail(body: Record<string, any>) {
  const { data, error } = await db.functions.invoke("send-email", { body });
  if (error) throw error;
  if (data && data.success === false) throw new Error(data?.error || "Send failed");
  return data;
}
