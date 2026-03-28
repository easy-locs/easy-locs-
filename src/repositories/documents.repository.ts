/**
 * documents.repository — All DB ops for document management components.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Document Builder ──
export async function insertDocument(record: Record<string, any>) {
  const { error } = await (supabase as any).from("documents").insert(record);
  if (error) throw error;
}

export async function updateDocument(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("documents").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function insertAuditLog(record: Record<string, any>) {
  await (supabase as any).from("audit_logs").insert(record);
}

// ── Document Center ──
export async function createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function sendEmailViaFunction(body: Record<string, any>) {
  await supabase.functions.invoke("send-email", { body });
}

// ── Signature ──
export async function uploadSignature(path: string, blob: Blob) {
  const { error } = await supabase.storage.from("rental-docs").upload(path, blob, { contentType: "image/png" });
  if (error) throw error;
}

export async function fetchOrgOwnerUserId(orgId: string) {
  const { data } = await supabase.from("orgs").select("owner_user_id").eq("id", orgId).single();
  return (data as any)?.owner_user_id ?? null;
}

export async function insertNotification(record: Record<string, any>) {
  await (supabase as any).from("app_notifications").insert(record);
}

// ── Storage general ──
export async function uploadToStorage(bucket: string, path: string, file: File | Blob, options?: Record<string, any>) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, options);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeFromStorage(bucket: string, paths: string[]) {
  await supabase.storage.from(bucket).remove(paths);
}

export async function downloadFromStorage(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}

// ── Lease form ──
export async function fetchProperties(orgId: string) {
  const { data } = await supabase.from("properties").select("id, label, address, city, country").eq("org_id", orgId);
  return data ?? [];
}

export async function fetchTenants(orgId: string) {
  const { data } = await supabase.from("tenants").select("id, name, email, property_id, rent_amount, charges_amount, deposit_amount, tenant_user_id").eq("org_id", orgId);
  return data ?? [];
}

export async function updateLease(leaseId: string, updates: Record<string, any>) {
  const { error } = await supabase.from("leases").update(updates as any).eq("id", leaseId);
  if (error) throw error;
}

export async function insertLease(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("leases").insert(record).select("id").single();
  if (error) throw error;
  return data?.id;
}

// ── Inventory ──
export async function fetchInventory(leaseId: string) {
  const { data } = await supabase.from("inventory_items").select("*").eq("lease_id", leaseId).order("room");
  return data ?? [];
}

export async function insertInventoryItem(record: Record<string, any>) {
  const { data, error } = await (supabase as any).from("inventory_items").insert(record).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(id: string, updates: Record<string, any>) {
  const { error } = await supabase.from("inventory_items").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadInventoryPhoto(path: string, file: File) {
  const { error } = await supabase.storage.from("rental-docs").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("rental-docs").getPublicUrl(path);
  return data.publicUrl;
}
