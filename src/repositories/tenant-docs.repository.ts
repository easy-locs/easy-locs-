/**
 * tenant-docs.repository — All DB operations for TenantDocuments component.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchTenantDocs(tenantId: string) {
  const { data } = await supabase.from("tenant_documents")
    .select("id, doc_type, label, file_url, filename, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchTenantContactInfo(tenantId: string) {
  const { data } = await supabase.from("tenants").select("email, tenant_user_id").eq("id", tenantId).single();
  return data;
}

export async function createSignedDocUrl(bucket: string, path: string, expiresIn = 60 * 60 * 24 * 7) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function uploadTenantDocument(orgId: string, tenantId: string, docType: string, label: string, file: File, userId: string) {
  const ext = file.name.split(".").pop();
  const path = `${orgId}/tenants/${tenantId}/${docType}_${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from("rental-docs").upload(path, file);
  if (uploadErr) throw uploadErr;
  const { error: insertErr } = await supabase.from("tenant_documents").insert({
    org_id: orgId, tenant_id: tenantId, doc_type: docType, label, file_url: path, filename: file.name, uploaded_by: userId,
  });
  if (insertErr) throw insertErr;
}

export async function validateTenantDoc(docId: string, status: "validated" | "rejected") {
  await supabase.from("tenant_documents").update({ status }).eq("id", docId);
}

export async function deleteTenantDoc(docId: string) {
  const { error } = await supabase.from("tenant_documents").delete().eq("id", docId);
  if (error) throw error;
}

export async function insertChatMessageV2(record: Record<string, any>) {
  const { error } = await (supabase as any).from("chat_messages_v2").insert(record);
  if (error) throw error;
}

export async function insertAppNotificationForTenant(record: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(record);
}

export async function invokeSendEmail(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("send-email", { body });
  if (error) throw error;
  if (data && data.success === false) throw new Error(data?.error || "Send failed");
  return data;
}
