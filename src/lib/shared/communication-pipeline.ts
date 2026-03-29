/**
 * communication-pipeline — Unified communication event dispatch.
 * Uses canonical send family for message insertion. Zero inline Supabase inserts.
 */
import { sendSystemEvent } from "@/families/send/send-system-event";
import { sendInAppNotification } from "@/lib/notifications/notification-dispatcher";
import type { SendContext } from "@/families/send/send-context";
import type { CommunicationEvent } from "./types";

export type { CommunicationEvent };

export async function sendCommunicationEvent(event: CommunicationEvent): Promise<void> {
  const results = { message: false, notification: false, email: false };

  // 1. Save message via canonical send family if conversation context exists
  try {
    const contextConvId = (event.meta as any)?.conversation_id;
    if (contextConvId) {
      const ctx: SendContext = {
        conversationId: contextConvId,
        senderUserId: event.senderId || "00000000-0000-0000-0000-000000000000",
        senderOrbitId: "system",
      };

      const body = (event.meta as any)?.booking_id
        ? `${event.message}\n\n[Booking: ${(event.meta as any).booking_id}]`
        : event.message;

      await sendSystemEvent(ctx, event.category || "system", body, {
        context_type: (event.meta as any)?.target_type || "general",
        context_id: (event.meta as any)?.target_id || null,
        category: event.category || "general",
      });
    }
    results.message = true;
  } catch (err) {
    console.error("[communication-pipeline] message insert failed:", err);
  }

  // 2. In-app notification
  try {
    if (event.recipientUserId) {
      await sendInAppNotification({
        userId: event.recipientUserId,
        title: event.subject,
        body: event.message,
        metadata: event.meta as any,
      });
    }
    results.notification = true;
  } catch (err) {
    console.error("[communication-pipeline] notification failed:", err);
  }

  // 3. Email (placeholder for future integration)
  if (event.recipientEmail) {
    results.email = false; // not yet implemented
  }
}
