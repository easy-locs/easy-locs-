/**
 * Deal Room Repository — All deal_rooms and deal_events DB operations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchDealRoom(dealId: string) {
  const { data, error } = await supabase.from("deal_rooms").select("*").eq("id", dealId).single();
  if (error) throw error;
  return data;
}

export async function fetchDealEvents(dealId: string) {
  const { data, error } = await supabase.from("deal_events").select("*").eq("deal_id", dealId).order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchMyDeals(userId: string) {
  const { data, error } = await supabase.from("deal_rooms").select("*").or(`buyer_id.eq.${userId}`).neq("status", "cancelled" as any).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchOrgDeals(orgId: string) {
  const { data, error } = await supabase.from("deal_rooms").select("*").eq("org_id", orgId).neq("status", "cancelled" as any).order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function findExistingDealRoom(contextType: string, contextId: string, buyerId: string) {
  const { data } = await supabase.from("deal_rooms").select("*").eq("context_type", contextType).eq("context_id", contextId).eq("buyer_id", buyerId).neq("status", "cancelled" as any).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function createDealRoom(payload: Record<string, any>) {
  const { data, error } = await supabase.from("deal_rooms").insert(payload as any).select().single();
  if (error) throw error;
  return data;
}

export async function insertDealEvent(payload: Record<string, any>) {
  await supabase.from("deal_events").insert(payload as any);
}

export async function updateDealRoom(dealId: string, updates: Record<string, any>) {
  const { error } = await supabase.from("deal_rooms").update(updates as any).eq("id", dealId);
  if (error) throw error;
}

export async function updateMarketplaceBooking(bookingId: string, updates: Record<string, any>) {
  const { error } = await supabase.from("marketplace_bookings").update(updates).eq("id", bookingId);
  if (error) throw error;
}

export async function invokeRefund(bookingId: string, bookingType: string, reason: string) {
  const { data, error } = await supabase.functions.invoke("process-refund", {
    body: { booking_id: bookingId, booking_type: bookingType, reason },
  });
  if (error) throw error;
  return data;
}
