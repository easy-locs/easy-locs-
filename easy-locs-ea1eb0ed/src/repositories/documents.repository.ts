/**
 * documents.repository — All DB ops for document management components.
 */
import { db } from "@/services/db";

// ── Document Builder ──
export async function insertDocument(record: Record<string, any>) {
  const { error } = await db("documents").insert(record);
  if (error) throw error;
}

export async function updateDocument(id: string, updates: Record<string, any>) {
  const { error } = await db("documents").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string) {
  const { error } = await db("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function insertAuditLog(record: Record<string, any>) {
  await db("audit_logs").insert(record);
}

// ── Document Center ──
export async function createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function sendEmailViaFunction(body: Record<string, any>) {
  await db.functions.invoke("send-email", { body });
}

// ── Signature ──
export async function uploadSignature(path: string, blob: Blob) {
  const { error } = await db.storage.from("rental-docs").upload(path, blob, { contentType: "image/png" });
  if (error) throw error;
}

export async function fetchOrgOwnerUserId(orgId: string) {
  const { data, error } = await db("orgs").select("owner_user_id").eq("id", orgId).single();
  if (error) {
    console.warn("[documents.repository] fetchOrgOwnerUserId error:", error.message);
    return null;
  }
  return (data as any)?.owner_user_id ?? null;
}

export async function insertNotification(record: Record<string, any>) {
  await db("app_notifications").insert(record);
}

// ── Storage general ──
export async function uploadToStorage(bucket: string, path: string, file: File | Blob, options?: Record<string, any>) {
  const { error } = await db.storage.from(bucket).upload(path, file, options);
  if (error) throw error;
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeFromStorage(bucket: string, paths: string[]) {
  await db.storage.from(bucket).remove(paths);
}

export async function downloadFromStorage(bucket: string, path: string) {
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}

// ── Lease form ──
export async function fetchProperties(orgId: string) {
  const { data } = await db("properties").select("id, label, address, city, country").eq("org_id", orgId);
  return data ?? [];
}

export async function fetchTenants(orgId: string) {
  const { data } = await db("tenants").select("id, name, email, property_id, rent_amount, charges_amount, deposit_amount, tenant_user_id").eq("org_id", orgId);
  return data ?? [];
}

export async function updateLease(leaseId: string, updates: Record<string, any>) {
  const { error } = await db("leases").update(updates as any).eq("id", leaseId);
  if (error) throw error;
}

export async function insertLease(record: Record<string, any>) {
  const { data, error } = await db("leases").insert(record).select("id").single();
  if (error) throw error;
  return data?.id;
}

// ── Inventory ──
export async function fetchInventory(leaseId: string) {
  const { data } = await db("inventory_items").select("*").eq("lease_id", leaseId).order("room");
  return data ?? [];
}

export async function insertInventoryItem(record: Record<string, any>) {
  const { data, error } = await db("inventory_items").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(id: string, updates: Record<string, any>) {
  const { error } = await db("inventory_items").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await db("inventory_items").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadInventoryPhoto(path: string, file: File) {
  const { error } = await db.storage.from("rental-docs").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = db.storage.from("rental-docs").getPublicUrl(path);
  return data.publicUrl;
}

// ── DocumentCenter extras ──
export async function fetchDocumentsForOrg(orgId: string) {
  const { data } = await db
    .from("documents")
    .select("id, title, doc_type, status, pdf_url, created_at, requires_signature, signed_by_owner_at, signed_by_tenant_at, emailed_at, country")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function fetchDocDataJson(docId: string) {
  const { data } = await db("documents").select("data_json").eq("id", docId).single();
  return data;
}

export async function fetchTenantById(tenantId: string) {
  const { data } = await db("tenants").select("email, name, tenant_user_id").eq("id", tenantId).single();
  return data;
}

export async function markDocumentEmailed(docId: string) {
  await db("documents").update({ emailed_at: new Date().toISOString() } as any).eq("id", docId);
}
