/**
 * inventory.repository — All DB operations for inventory reports.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchInventoryReport(reportId: string) {
  const { data } = await cFrom("inventory_reports").select("*").eq("id", reportId).single();
  return data;
}

export async function fetchInventoryRooms(reportId: string) {
  const { data } = await cFrom("inventory_rooms").select("*").eq("report_id", reportId).order("sort_order");
  return data || [];
}

export async function fetchInventoryItems(roomId: string) {
  const { data } = await cFrom("inventory_items").select("*").eq("room_id", roomId).order("sort_order");
  return data || [];
}

export async function insertInventoryReport(record: Record<string, any>) {
  const { data, error } = await cFrom("inventory_reports").insert(record).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateInventoryReport(reportId: string, fields: Record<string, any>) {
  await cFrom("inventory_reports").update(fields).eq("id", reportId);
}

export async function deleteRoomsForReport(reportId: string) {
  await cFrom("inventory_rooms").delete().eq("report_id", reportId);
}

export async function insertRoom(record: Record<string, any>) {
  const { data, error } = await cFrom("inventory_rooms").insert(record).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function insertItems(items: Record<string, any>[]) {
  const { error } = await cFrom("inventory_items").insert(items);
  if (error) throw error;
}

export async function uploadInventoryPhoto(orgId: string, reportId: string, roomId: string, itemId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${orgId}/${reportId || "new"}/${roomId}/${itemId}_${Date.now()}.${ext}`;
  const { error } = await db.storage.from("rental-docs").upload(path, file);
  if (error) throw error;
  const { data } = await db.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl || path;
}

export async function fetchSignatureUrl(userId: string) {
  const { data } = await cFrom("profiles").select("signature_url").eq("id", userId).single();
  return data?.signature_url || null;
}

export async function fetchOrgStampUrl(orgId: string) {
  const { data } = await cFrom("orgs").select("stamp_url").eq("id", orgId).single();
  return (data as any)?.stamp_url || null;
}

export async function fetchTenantName(tenantId: string) {
  const { data } = await cFrom("tenants").select("name").eq("id", tenantId).single();
  return data?.name || null;
}

// ── Send email ──
export async function invokeSendEmail(body: Record<string, any>) {
  const { error } = await db.functions.invoke("send-email", { body });
  if (error) throw error;
}

// ── Inventory rooms/items for report ──
export async function fetchInventoryRoomsWithItems(reportId: string) {
  const { data: rooms } = await cFrom("inventory_rooms").select("*").eq("report_id", reportId).order("sort_order");
  const result = [];
  for (const r of rooms || []) {
    const { data: items } = await cFrom("inventory_items").select("*").eq("room_id", r.id).order("sort_order");
    result.push({
      room_name: r.room_name,
      items: (items || []).map((it: any) => ({
        element_name: it.element_name, condition: it.condition,
        notes: it.notes || "", photo_urls: Array.isArray(it.photo_urls) ? it.photo_urls : [],
      })),
    });
  }
  return result;
}

export async function fetchInventoryReportById(reportId: string) {
  const { data } = await cFrom("inventory_reports").select("*").eq("id", reportId).single();
  return data;
}

export async function fetchInventoryReportsForOrg(orgId: string) {
  const { data } = await cFrom("inventory_reports")
    .select("id, property_id, tenant_id, report_type, report_date, status")
    .eq("org_id", orgId).order("report_date", { ascending: false });
  return data || [];
}
