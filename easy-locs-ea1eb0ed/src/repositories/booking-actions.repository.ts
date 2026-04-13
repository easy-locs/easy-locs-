/**
 * booking-actions.repository — DB operations for booking status transitions.
 */
import { db } from "@/services/db";

export async function updateMarketplaceBooking(bookingId: string, status: string) {
  await db("marketplace_bookings").update({ status }).eq("id", bookingId);
}

export async function updateConciergeOrder(bookingId: string, status: string, action: string) {
  const updates: any = { status };
  if (action === "confirm") updates.confirmed_at = new Date().toISOString();
  if (action === "cancel") updates.cancelled_at = new Date().toISOString();
  if (action === "complete") updates.completed_at = new Date().toISOString();
  await db("concierge_orders").update(updates).eq("id", bookingId);
}

export async function updateBookingRequest(bookingId: string, status: string) {
  await db("bookings").update({ status }).eq("id", bookingId);
}

export async function insertChatMessage(conversationId: string, senderUserId: string, senderOrbitId: string, body: string, metadata: Record<string, any>) {
  const { insertMessage } = await import("@/repositories/communication.repository");
  await insertMessage({
    conversationId,
    senderUserId,
    senderOrbitId,
    type: "system",
    body,
    metadata: { schemaVersion: 1, ...metadata },
  });
}

export async function updateConversationTimestamp(conversationId: string) {
  await db("conversations_v2").update({
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId);
}
