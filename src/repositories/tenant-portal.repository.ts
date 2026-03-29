/**
 * tenant-portal.repository — All DB operations for tenant portal pages.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Documents ──
export async function fetchTenantUploadedDocs(tenantId: string) {
  const { data } = await supabase
    .from("tenant_documents")
    .select("id, label, filename, file_url, status")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchLandlordDocs(orgId: string) {
  const { data } = await supabase
    .from("documents")
    .select("id, title, doc_type, status, pdf_url, created_at, requires_signature, signed_by_owner_at, signed_by_tenant_at, emailed_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  const relevantTypes = ["rent-receipt", "lease", "payment-notice", "inventory", "dunning", "termination", "sworn-statement"];
  return (data || []).filter((d: any) =>
    relevantTypes.includes(d.doc_type) && (d.status === "generated" || d.status === "signed" || d.status === "pending_signature" || d.emailed_at)
  );
}

export async function uploadTenantDoc(tenantId: string, orgId: string, userId: string, file: File, docType: string, label: string) {
  const path = `${orgId}/${tenantId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from("rental-docs").upload(path, file);
  if (upErr) throw upErr;
  const { error } = await supabase.from("tenant_documents").insert({
    tenant_id: tenantId, org_id: orgId, uploaded_by: userId,
    doc_type: docType, label, filename: file.name, file_url: path,
  });
  if (error) throw error;
}

export async function getDocLeaseId(docId: string) {
  const { data } = await supabase.from("documents").select("lease_id").eq("id", docId).single();
  return (data as any)?.lease_id ?? null;
}

export async function createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

// ── Receipts ──
export async function fetchTenantReceipts(tenantId: string) {
  const { data } = await supabase
    .from("rent_calls")
    .select("id, month, rent_amount, charges_amount, total_amount, paid, receipt_pdf_url, receipt_validated")
    .eq("tenant_id", tenantId)
    .eq("receipt_validated", true)
    .order("month", { ascending: false });
  return data || [];
}

export async function downloadFromStorage(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}

// ── Requests ──
export async function fetchDocumentRequests(tenantId: string) {
  const { data } = await supabase
    .from("document_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function insertDocumentRequest(tenantId: string, orgId: string, requestType: string, period: string | null) {
  const { error } = await supabase.from("document_requests").insert({
    tenant_id: tenantId, org_id: orgId, request_type: requestType, period,
  });
  if (error) throw error;
}

export async function fetchOrgOwnerInfo(orgId: string) {
  const { data } = await supabase.from("orgs").select("owner_user_id, email").eq("id", orgId).single();
  return data;
}

export async function insertNotification(record: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(record);
}

export async function invokeEmail(body: Record<string, any>) {
  await supabase.functions.invoke("send-email", { body });
}

// ── Reviews ──
export async function fetchTenantInfo(userId: string) {
  const { data } = await supabase.from("tenants").select("id, org_id, property_id").eq("tenant_user_id", userId).limit(1).single();
  return data;
}

export async function fetchTenantReviews(tenantId: string) {
  const { data } = await supabase.from("reviews").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return data || [];
}

export async function insertReview(record: Record<string, any>) {
  const { error } = await (supabase as any).from("reviews").insert(record);
  if (error) throw error;
}

export async function updateReview(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("reviews").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

// ── Messages ──
export async function fetchTenantMessages(conversationId: string) {
  const { data } = await (supabase as any)
    .from("chat_messages_v2").select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function markNotificationsRead(userId: string) {
  await (supabase as any).from("app_notifications")
    .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("category", "message").is("read_at", null);
}

export async function insertChatMessage(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export async function uploadChatFile(orgId: string, tenantId: string, file: File) {
  const path = `${orgId}/messages/${tenantId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("rental-docs").upload(path, file);
  if (error) throw error;
  const { data } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl || path;
}

export async function invokeTranslation(text: string, fromLocale: string, toLocale: string) {
  const { data } = await supabase.functions.invoke("translate-message", {
    body: { text, from_locale: fromLocale, to_locale: toLocale },
  });
  return data?.translated ?? null;
}

export async function updateMessageMetadata(msgId: string, metadata: Record<string, any>) {
  await (supabase as any).from("chat_messages_v2").update({ metadata }).eq("id", msgId);
}

export async function insertAuditLog(record: Record<string, any>) {
  await (supabase as any).from("audit_logs").insert(record);
}

export async function fetchOrgEmailAndOwner(orgId: string) {
  const { data } = await supabase.from("orgs").select("email, owner_user_id").eq("id", orgId).single();
  return data;
}

export async function fetchProfileEmail(userId: string) {
  const { data } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? null;
}

export function subscribeTenantMessages(tenantId: string, orgId: string, onInsert: (msg: any) => void) {
  const contextId = `tenant_${orgId}_${tenantId}`;
  const channel = supabase
    .channel(`tenant-messages-v2-${tenantId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2", filter: `conversation_id=eq.${contextId}` }, (payload) => {
      onInsert(payload.new);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// Re-export canonical identity helper
export { getCurrentUserIdOrNull as getAuthUser } from "@/families/identity";
