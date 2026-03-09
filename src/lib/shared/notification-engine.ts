/**
 * Unified Notification Engine
 * 
 * Single entry point for creating notifications across all modules.
 * Ensures consistent metadata format (DeepLinkMeta) for every notification.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DeepLinkMeta, NotificationPayload, TargetType, AppModule } from "./types";
import { buildTargetUrl } from "./routes";

/**
 * Create a standardized DeepLinkMeta object.
 * All modules MUST use this to build notification metadata.
 */
export function createDeepLinkMeta(opts: {
  targetType: TargetType;
  targetId: string;
  module: AppModule;
  countryCode?: string;
  bookingId?: string;
  orgId?: string;
  propertyId?: string;
  leaseId?: string;
}): DeepLinkMeta {
  const targetUrl = buildTargetUrl(opts.targetType, {
    targetId: opts.targetId,
    bookingId: opts.bookingId,
    countryCode: opts.countryCode,
  });

  return {
    target_type: opts.targetType,
    target_id: opts.targetId,
    target_url: targetUrl,
    module: opts.module,
    country_code: opts.countryCode || "",
    booking_id: opts.bookingId,
    org_id: opts.orgId,
    property_id: opts.propertyId,
    lease_id: opts.leaseId,
  };
}

/**
 * Create an in-app notification with standardized metadata.
 * This is the ONLY function that should insert into the notifications table from client code.
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      user_id: payload.userId,
      org_id: payload.orgId,
      type: payload.type,
      title: payload.title,
      message: payload.message.slice(0, 500),
      link: payload.meta.target_url,
      metadata_json: payload.meta as any,
    });
  } catch (e) {
    console.error("[notification-engine] insert failed:", e);
  }
}

/**
 * Mark a notification as read (on click).
 * Does NOT resolve — the notification stays in the active list.
 */
export async function markNotificationRead(notifId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notifId);
}

/**
 * Resolve a notification — call ONLY when the real action is completed:
 * - booking confirmed/cancelled
 * - payment validated
 * - document signed/processed
 * - status change completed
 * 
 * This removes the notification from the active list.
 * 
 * @param notifId - The notification ID to resolve
 * @param targetId - Optional: resolve all notifications pointing to this target
 */
export async function resolveNotification(notifId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      read: true,
    } as any)
    .eq("id", notifId);
}

/**
 * Resolve all notifications matching a specific target.
 * Called by destination pages when an action is completed on a record.
 * 
 * @param targetType - e.g. "marketplace_booking", "concierge_order", "booking_request"
 * @param targetId - the record ID
 * @param userId - optional: scope to a specific user's notifications
 * @param eventType - optional: only resolve notifications with this specific event_type
 *                    in metadata_json (prevents resolving unrelated notifications on the same record)
 * 
 * @example
 * // After confirming a booking — resolves all notifications for this booking:
 * await resolveNotificationsForTarget("marketplace_booking", bookingId);
 * 
 * // After payment only — resolves only payment notifications:
 * await resolveNotificationsForTarget("marketplace_booking", bookingId, userId, "payment_received");
 */
export async function resolveNotificationsForTarget(
  targetType: string,
  targetId: string,
  userId?: string,
  eventType?: string
): Promise<void> {
  try {
    const matchFilter: Record<string, string> = {
      target_type: targetType,
      target_id: targetId,
    };

    // When eventType is provided, only resolve notifications with that specific event
    // This prevents resolving unrelated notifications attached to the same record
    if (eventType) {
      matchFilter.event_type = eventType;
    }

    let query = supabase
      .from("notifications")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        read: true,
      } as any)
      .contains("metadata_json", matchFilter as any);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    await query;
    console.log(`[notification-engine] resolved notifications for ${targetType}:${targetId}${eventType ? ` (event: ${eventType})` : ""}`);
  } catch (e) {
    console.error("[notification-engine] resolveForTarget failed:", e);
  }
}
