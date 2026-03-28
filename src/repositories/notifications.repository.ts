/**
 * notifications.repository — Centralized app_notifications writes.
 * No component should insert notifications directly.
 */
import { supabase } from "@/integrations/supabase/client";

export interface NotificationPayload {
  userId: string;
  title: string;
  body?: string;
  category: string;
  severity?: string;
  scope?: string;
  entityId?: string;
  entityType?: string;
  route?: string;
}

export async function createNotification(payload: NotificationPayload) {
  const { error } = await (supabase as any).from("app_notifications").insert({
    user_id: payload.userId,
    title: payload.title,
    body: payload.body || null,
    category: payload.category,
    severity: payload.severity || "info",
    scope: payload.scope || "global",
    entity_id: payload.entityId || null,
    entity_type: payload.entityType || null,
    route: payload.route || null,
  });
  if (error) console.error("[notifications.repository] insert failed:", error);
}
