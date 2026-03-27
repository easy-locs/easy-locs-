/**
 * Unified Notification Engine
 * 
 * Single entry point for creating notifications across all modules.
 * Ensures consistent metadata format (DeepLinkMeta) for every notification.
 * Uses canonical `app_notifications` table.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DeepLinkMeta, NotificationPayload, TargetType, AppModule } from "./types";
import { buildTargetUrl } from "./routes";

const db = supabase as any;

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
 * This is the ONLY function that should insert into app_notifications from client code.
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await db.from("app_notifications").insert({
      user_id: payload.userId,
      scope: "global",
      category: payload.type,
      title: payload.title,
      body: payload.message.slice(0, 500),
      route: payload.meta.target_url,
      severity: "info",
      entity_type: payload.meta.target_type,
      entity_id: payload.meta.target_id,
      metadata: payload.meta as any,
    });
  } catch (e) {
    console.error("[notification-engine] insert failed:", e);
  }
}

/**
 * Mark a notification as read (on click).
 */
export async function markNotificationRead(notifId: string): Promise<void> {
  await db
    .from("app_notifications")
    .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", notifId);
}

/**
 * Resolve a notification — dismiss it from the active list.
 */
export async function resolveNotification(notifId: string): Promise<void> {
  await db
    .from("app_notifications")
    .update({
      dismissed_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notifId);
}

/**
 * Resolve all notifications matching a specific target.
 */
export async function resolveNotificationsForTarget(
  targetType: string,
  targetId: string,
  userId?: string,
  _eventType?: string
): Promise<void> {
  try {
    let query = db
      .from("app_notifications")
      .update({
        dismissed_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("entity_type", targetType)
      .eq("entity_id", targetId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    await query;
    console.log(`[notification-engine] resolved notifications for ${targetType}:${targetId}`);
  } catch (e) {
    console.error("[notification-engine] resolveForTarget failed:", e);
  }
}
