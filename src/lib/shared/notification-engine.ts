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
 * Mark a notification as read.
 */
export async function markNotificationRead(notifId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true } as any)
    .eq("id", notifId);
}

/**
 * Resolve a notification — removes from active list.
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
