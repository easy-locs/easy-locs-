/**
 * booking-actions.repository — DB operations for booking status transitions.
 */
import { supabase } from "@/integrations/supabase/client";

export async function updateMarketplaceBooking(bookingId: string, status: string) {
  await supabase.from("marketplace_bookings").update({ status }).eq("id", bookingId);
}

export async function updateConciergeOrder(bookingId: string, status: string, action: string) {
  const updates: any = { status };
  if (action === "confirm") updates.confirmed_at = new Date().toISOString();
  if (action === "cancel") updates.cancelled_at = new Date().toISOString();
  if (action === "complete") updates.completed_at = new Date().toISOString();
  await supabase.from("concierge_orders").update(updates).eq("id", bookingId);
}

export async function updateBookingRequest(bookingId: string, status: string) {
  await supabase.from("booking_requests").update({ status }).eq("id", bookingId);
}

export async function insertChatMessage(conversationId: string, senderUserId: string, senderOrbitId: string, body: string, metadata: Record<string, any>) {
  await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: conversationId,
    sender_user_id: senderUserId,
    sender_orbit_id: senderOrbitId,
    type: "system",
    body,
    metadata,
  });
}

export async function updateConversationTimestamp(conversationId: string) {
  await (supabase as any).from("conversations_v2").update({
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);
}
