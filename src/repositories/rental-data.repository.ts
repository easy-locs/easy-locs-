/**
 * rental-data.repository.ts — Single source of truth for all rental DB operations.
 * Replaces inline supabase calls in useRentalData, useRentalPropertyDetail,
 * useRentalRentCalls, useRentalReceipts, useRentalMessages, useRentalNotifications,
 * useLeaseAutoGenerator, useRentalLeaseGenerator, useRentalModeBadges, useRentalRealtimeBridge.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Properties ───
export async function fetchProperties(orgId: string, countryFilter?: string | null) {
  let q = supabase.from("properties").select("*").eq("org_id", orgId);
  if (countryFilter) q = q.eq("country", countryFilter);
  const { data } = await q.order("label");
  return data ?? [];
}

export async function upsertProperty(orgId: string, userId: string, record: Record<string, any>, editId?: string) {
  const payload = { org_id: orgId, user_id: userId, ...record };
  if (editId) {
    const { error } = await supabase.from("properties").update(payload).eq("id", editId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("properties").insert(payload);
    if (error) throw error;
  }
}

export async function deleteProperty(id: string) {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;
}

// ─── Tenants ───
export async function fetchTenants(orgId: string) {
  const { data } = await supabase.from("tenants").select("*").eq("org_id", orgId).order("name");
  return data ?? [];
}

export async function upsertTenant(orgId: string, userId: string, record: Record<string, any>, editId?: string) {
  const payload = { org_id: orgId, user_id: userId, ...record };
  if (editId) {
    const { error } = await supabase.from("tenants").update(payload).eq("id", editId);
    if (error) throw error;
    return editId;
  } else {
    const { data, error } = await supabase.from("tenants").insert(payload).select("id").single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteTenant(id: string) {
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw error;
}

// ─── Rent Calls ───
export async function fetchRentCalls(orgId: string) {
  const { data } = await supabase.from("rent_calls").select("*").eq("org_id", orgId).order("month", { ascending: false });
  return data ?? [];
}

export async function fetchExistingRentCallsForMonth(orgId: string, month: string) {
  const { data } = await supabase.from("rent_calls").select("tenant_id").eq("org_id", orgId).eq("month", month);
  return data ?? [];
}

export async function insertRentCalls(calls: Record<string, any>[]) {
  const { error } = await supabase.from("rent_calls").upsert(calls, { onConflict: "org_id,tenant_id,month", ignoreDuplicates: true });
  if (error) throw error;
}

export async function updateRentCall(id: string, update: Record<string, any>) {
  const { error } = await supabase.from("rent_calls").update(update).eq("id", id);
  if (error) throw error;
}

export async function insertSingleRentCall(record: Record<string, any>) {
  const { data, error } = await supabase.from("rent_calls").insert(record).select("id").single();
  if (error) throw error;
  return data;
}

// ─── Profiles / Org ───
export async function fetchProfile(userId: string) {
  const { data } = await supabase.from("profiles").select("name, email, signature_url").eq("id", userId).single();
  return data;
}

export async function fetchOwnerProfile(orgId: string) {
  const { data } = await supabase.from("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).maybeSingle();
  return data;
}

export async function fetchOrgInfo(orgId: string) {
  const { data } = await supabase.from("orgs").select("stamp_url, name, address, postal_code, city").eq("id", orgId).single();
  return data;
}

// ─── Documents ───
export async function insertDocument(record: Record<string, any>) {
  const { error } = await supabase.from("documents").insert(record);
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
  await (supabase as any).from("app_notifications").insert(record);
}

// ─── Property Detail (expenses, furniture, inventories) ───
export async function fetchPropertyDetail(orgId: string, propertyId: string) {
  const [{ data: exp }, { data: fur }, { data: inv }] = await Promise.all([
    supabase.from("expenses").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("expense_date", { ascending: false }),
    supabase.from("furniture_items").select("*").eq("org_id", orgId).eq("property_id", propertyId),
    supabase.from("inventory_reports").select("*").eq("org_id", orgId).eq("property_id", propertyId).order("report_date", { ascending: false }),
  ]);
  return { expenses: exp ?? [], furniture: fur ?? [], inventories: inv ?? [] };
}

// ─── Mode Badges ───
export async function fetchModeBadges(orgId: string) {
  const [{ data: seasonal }, { data: realEstate }] = await Promise.all([
    supabase.from("public_listings").select("property_id").eq("org_id", orgId).eq("active", true),
    supabase.from("real_estate_listings").select("property_id, listing_type").eq("org_id", orgId).eq("status", "active"),
  ]);
  return {
    seasonalIds: new Set((seasonal ?? []).map((s: any) => s.property_id).filter(Boolean)),
    saleIds: new Set((realEstate ?? []).filter((r: any) => r.listing_type === "sale").map((r: any) => r.property_id).filter(Boolean)),
  };
}

// ─── Messages (V2) ───
export async function fetchChatMessages(orgId: string, tenantId: string) {
  const contextId = `tenant_${orgId}_${tenantId}`;
  const { data } = await (supabase as any).from("chat_messages_v2").select("*").eq("conversation_id", contextId).order("created_at", { ascending: true });
  return data ?? [];
}

export async function insertChatMessage(orgId: string, tenantId: string, userId: string, body: string) {
  const contextId = `tenant_${orgId}_${tenantId}`;
  const { error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: contextId, sender_user_id: userId,
    sender_orbit_id: `orbit_${userId.slice(0, 12)}`, type: "text", body,
  });
  if (error) throw error;
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
  return () => { supabase.removeChannel(channel); };
}

// ─── Stripe Rent Payment ───
export async function invokeRentPayment(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("create-rent-payment", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
