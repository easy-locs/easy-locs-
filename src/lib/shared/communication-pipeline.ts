/**
 * Unified Communication Pipeline
 * 
 * Single entry point for the triple-sync pattern:
 * 1. Save message in database
 * 2. Create in-app notification
 * 3. Send email via edge function
 * 4. (UI updates happen reactively via Supabase Realtime)
 * 
 * Works consistently for long-term, seasonal, and marketplace modules.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CommunicationEvent } from "./types";
import { createNotification } from "./notification-engine";

/**
 * Execute the full communication pipeline for any module event.
 * 
 * @example
 * await sendCommunicationEvent({
 *   orgId,
 *   senderId: user.id,
 *   recipientUserId: ownerId,
 *   recipientEmail: "owner@example.com",
 *   subject: "🏖️ New booking request",
 *   message: "John wants to book from 2024-01-01 to 2024-01-07",
 *   category: "booking",
 *   meta: createDeepLinkMeta({ targetType: "booking_request", targetId: bookingId, module: "seasonal", countryCode: "FR" }),
 * });
 */
export async function sendCommunicationEvent(event: CommunicationEvent): Promise<void> {
  const results = { message: false, notification: false, email: false };

  // 1. Save message in V2 communication system (if a conversation context exists)
  try {
    // Communication pipeline messages go to chat_messages_v2 if a conversation is available
    // Otherwise, this is a notification-only event
    const contextConvId = event.meta?.conversation_id;
    if (contextConvId) {
      await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: contextConvId,
        sender_user_id: event.senderId || "00000000-0000-0000-0000-000000000000",
        sender_orbit_id: "system",
        type: "system",
        body: event.meta.booking_id
          ? `${event.message}\n\n[Booking: ${event.meta.booking_id}]`
          : event.message,
        metadata: {
          context_type: event.meta.target_type || "general",
          context_id: event.meta.target_id || null,
          category: event.category || "general",
        },
      });
    }
    results.message = true;
  } catch (e) {
    console.error("[comm-pipeline] message insert failed:", e);
  }

  // 2. Create in-app notification (if recipient user specified)
  if (event.recipientUserId) {
    try {
      await createNotification({
        userId: event.recipientUserId,
        orgId: event.orgId,
        type: event.category === "payment" ? "payment" : "info",
        title: event.subject,
        message: event.message.slice(0, 200),
        meta: event.meta,
      });
      results.notification = true;
    } catch (e) {
      console.error("[comm-pipeline] notification failed:", e);
    }
  }

  // 3. Send email via edge function (if recipient email specified)
  if (event.recipientEmail) {
    try {
      const emailEventMap: Record<string, string> = {
        booking_request: "booking_request",
        payment: "payment_received",
        dunning: "dunning",
        lease: "lease_signed",
        intervention: "intervention",
        marketplace_booking: "booking_request",
        concierge_order: "booking_request",
      };
      const emailEventType = emailEventMap[event.meta.target_type] || "marketplace_notification";

      // Build absolute CTA URL for email using the same deep-link resolver
      const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "https://easy-locs.lovable.app";
      const ctaUrl = event.meta.target_url
        ? `${appBaseUrl}${event.meta.target_url.startsWith("/") ? event.meta.target_url : `/${event.meta.target_url}`}`
        : undefined;

      await supabase.functions.invoke("send-notification-email", {
        body: {
          event_type: emailEventType,
          recipient_email: event.recipientEmail,
          data: {
            subject: event.subject,
            message: event.message,
            booking_id: event.meta.booking_id || "",
            attachment_url: event.attachmentUrl || "",
            attachment_name: event.attachmentName || "",
            cta_url: ctaUrl,
            cta_label: event.subject,
            org_id: event.orgId,
          },
          locale: event.emailLocale || "fr",
        },
      });
      results.email = true;
    } catch (e) {
      console.error("[comm-pipeline] email failed:", e);
    }
  }

  console.log("[comm-pipeline] event sent:", event.subject, results);
}
