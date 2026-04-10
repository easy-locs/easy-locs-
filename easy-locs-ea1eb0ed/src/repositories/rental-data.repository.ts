/**
 * rental-data.repository.ts — Single source of truth for all rental DB operations.
 * Replaces inline supabase calls in useRentalData, useRentalPropertyDetail,
 * useRentalRentCalls, useRentalReceipts, useRentalMessages, useRentalNotifications,
 * useLeaseAutoGenerator, useRentalLeaseGenerator, useRentalModeBadges, useRentalRealtimeBridge.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

// ─── Properties ───
export async function fetchProperties(orgId: string, countryFilter?: string | null) {
  let q = db("properties").select("*").eq("org_id", orgId);
  if (countryFilter) q = q.eq("country", countryFilter);
  const { data } = await q.order("label");
  return data ?? [];
}

export async function upsertProperty(orgId: string, userId: string, record: Record<string, any>, editId?: string) {
  const payload = { org_id: orgId, user_id: userId, ...record };
  if (editId) {
    const { error } = await db("properties").update(payload as any).eq("id", editId);
    if (error) throw error;
  } else {
    const { error } = await db("properties").insert(payload as any);
    if (error) throw error;
  }
}

export async function deleteProperty(id: string) {
  const { error } = await db("properties").delete().eq("id", id);
  if (error) throw error;
}

// ─── Tenants ───
export async function fetchTenants(orgId: string) {
  const { data } = await db("tenants").select("*").eq("org_id", orgId).order("name");
  return data ?? [];
}

export async function upsertTenant(orgId: string, userId: string, record: Record<string, any>, editId?: string) {
  const payload = { org_id: orgId, user_id: userId, ...record };
  if (editId) {
    const { error } = await db("tenants").update(payload as any).eq("id", editId);
    if (error) throw error;
    return editId;
  } else {
    const { data, error } = await db("tenants").insert(payload as any).select("id").single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteTenant(id: string) {
  const { error } = await db("tenants").delete().eq("id", id);
  if (error) throw error;
}

// ─── Rent Calls ───
export async function fetchRentCalls(orgId: string) {
  const { data } = await db("rent_calls").select("*").eq("org_id", orgId).order("month", { ascending: false });
  return data ?? [];
}

export async function fetchExistingRentCallsForMonth(orgId: string, month: string) {
  const { data } = await db("rent_calls").select("tenant_id").eq("org_id", orgId).eq("month", month);
  return data ?? [];
}

export async function insertRentCalls(calls: Record<string, any>[]) {
  const { error } = await db("rent_calls").upsert(calls as any, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
  if (error) throw error;
}

export async function updateRentCall(id: string, update: Record<string, any>) {
  const { error } = await db("rent_calls").update(update).eq("id", id);
  if (error) throw error;
}

export async function insertSingleRentCall(record: Record<string, any>) {
  const { data, error } = await db("rent_calls").insert(record as any).select("id").single();
  if (error) throw error;
  return data;
}

// ─── Profiles / Org ───
export async function fetchProfile(userId: string) {
  const { data } = await db("profiles").select("name, email, signature_url").eq("id", userId).single();
  return data;
}

export async function fetchOwnerProfile(orgId: string) {
  const { data } = await db("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).maybeSingle();
  return data;
}

export async function fetchOrgInfo(orgId: string) {
  const { data } = await db("orgs").select("stamp_url, name, address, postal_code, city").eq("id", orgId).single();
  return data;
}

// ─── Documents ───
export async function insertDocument(record: Record<string, any>) {
  const { error } = await db("documents").insert(record as any);
  if (error) throw error;
}

// ─── Email ───
export async function invokeSendEmail(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("send-email", { body });
  if (error) throw error;
  return data;
}

// ─── App Notifications ───
export async function insertAppNotification(record: Record<string, any>) {
  await db("app_notifications").insert(record);
}

// ─── Property Detail (expenses, furniture, inventories) ───
export async function fetchPropertyDetail(orgId: string, propertyId: string) {
  const [{ data: exp }, { data: fur }, { data: inv }] = await Promise.all([
    db("expenses").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("expense_date", { ascending: false }),
    db("furniture_items").select("*").eq("org_id", orgId).eq("property_id", propertyId),
    db("inventory_reports").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("report_date", { ascending: false }),
  ]);
  return { expenses: exp ?? [], furniture: fur ?? [], inventories: inv ?? [] };
}

// ─── Mode Badges ───
export async function fetchModeBadges(orgId: string) {
  const [{ data: seasonal }, { data: realEstate }] = await Promise.all([
    db("public_listings").select("property_id").eq("org_id", orgId).eq("active", true),
    db("real_estate_listings").select("property_id, listing_type").eq("org_id", orgId).eq("status", "active"),
  ]);
  return {
    seasonalIds: new Set((seasonal ?? []).map((s: any) => s.property_id).filter(Boolean)),
    saleIds: new Set((realEstate ?? []).filter((r: any) => r.listing_type === "sale").map((r: any) => r.property_id).filter(Boolean)),
  };
}

// ─── Messages (V2) ───
export async function fetchChatMessages(orgId: string, tenantId: string) {
  const contextId = `tenant_${orgId}_${tenantId}`;
  const { data } = await db("chat_messages_v2").select("*").eq("conversation_id", contextId).order("created_at", { ascending: true });
  return data ?? [];
}

export async function insertChatMessage(orgId: string, tenantId: string, userId: string, body: string) {
  const { insertMessage } = await import("@/repositories/communication.repository");
  const contextId = `tenant_${orgId}_${tenantId}`;
  await insertMessage({
    conversationId: contextId,
    senderUserId: userId,
    senderOrbitId: `orbit_${userId.replace(/-/g, "").substring(0, 8)}`,
    type: "text",
    body,
    metadata: { schemaVersion: 1 },
  });
}

export function subscribeToRentalChat(tenantId: string, onInsert: (msg: any) => void, onUpdate: (msg: any) => void) {
  const channel = supabase
    .channel(`rental-msg-${tenantId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages_v2" }, (p) => {
      const msg = p.new as any;
      if (msg.metadata?.tenant_id === tenantId || msg.conversation_id?.includes(tenantId)) onInsert(msg);
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages_v2" }, (p) => onUpdate(p.new as any))
    .subscribe();
  return () => { removeRealtimeChannel(channel); };
}

// ─── Stripe Rent Payment ───
export async function invokeRentPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-rent-payment", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Tenant Invitations ───
export async function insertTenantInvitation(record: Record<string, any>) {
  const { error } = await db("tenant_invitations").insert(record as any);
  if (error) throw error;
}

export async function fetchPropertyCountry(propertyId: string) {
  const { data } = await db("properties").select("country").eq("id", propertyId).single();
  return data?.country ?? "FR";
}

// ─── Tenant Assignment ───
export async function updateTenantProperty(tenantId: string, propertyId: string) {
  const { error } = await db("tenants").update({ property_id: propertyId } as any).eq("id", tenantId);
  if (error) throw error;
}
