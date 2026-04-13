/**
 * activity-log.repository — DB operations for EntityActivityLog.
 */
import { db } from "@/services/db";

export async function fetchMessages(entityType: string, entityId: string, maxItems: number) {
  let q = db("chat_messages_v2").select("id, body, created_at, sender_user_id, type, metadata");
  if (entityType === "property") q = q.eq("property_id", entityId);
  else if (entityType === "tenant") q = q.eq("tenant_id", entityId);
  else if (entityType === "booking") q = q.eq("booking_id", entityId);
  const { data } = await q.order("created_at", { ascending: false }).limit(maxItems);
  return data || [];
}

export async function fetchPayments(orgId: string, entityType: string, entityId: string, maxItems: number) {
  let q = db("rent_calls").select("id, month, total_amount, paid, paid_date").eq("org_id", orgId);
  if (entityType === "property") q = q.eq("property_id", entityId);
  if (entityType === "tenant") q = q.eq("tenant_id", entityId);
  const { data } = await q.order("month", { ascending: false }).limit(maxItems);
  return data || [];
}

export async function fetchDocuments(orgId: string, entityType: string, entityId: string, maxItems: number) {
  let q = db("documents").select("id, title, doc_type, created_at, status").eq("org_id", orgId);
  if (entityType === "property") {
    const { data: leases } = await db("leases").select("id").eq("property_id", entityId).eq("org_id", orgId);
    if (leases?.length) q = q.in("lease_id", leases.map(l => l.id));
  }
  const { data } = await q.order("created_at", { ascending: false }).limit(maxItems);
  return data || [];
}

export async function fetchInterventions(orgId: string, entityType: string, entityId: string, maxItems: number) {
  let q = db("interventions").select("id, title, status, priority, created_at, category").eq("org_id", orgId);
  if (entityType === "property") q = q.eq("property_id", entityId);
  if (entityType === "tenant") q = q.eq("tenant_id", entityId);
  const { data } = await q.order("created_at", { ascending: false }).limit(maxItems);
  return data || [];
}

export async function fetchBookingRequests(orgId: string, entityId: string, maxItems: number) {
  const { data } = await db("booking_requests")
    .select("id, guest_name, check_in, check_out, status, created_at")
    .eq("property_id", entityId).eq("org_id", orgId)
    .order("created_at", { ascending: false }).limit(maxItems);
  return data || [];
}

export async function fetchLeases(orgId: string, entityType: string, entityId: string) {
  let q = db("leases").select("id, lease_type, start_date, end_date, rent_amount, status, created_at").eq("org_id", orgId);
  if (entityType === "property") q = q.eq("property_id", entityId);
  if (entityType === "tenant") q = q.eq("tenant_id", entityId);
  const { data } = await q.order("created_at", { ascending: false }).limit(10);
  return data || [];
}
