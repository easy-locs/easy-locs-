/**
 * Canonical notification dispatcher — single entry point for all in-app notifications.
 * Uses the `app_notifications` table (V2 canonical) with dedup support.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  deepLink?: string | null;
  eventType?: string | null;
  dedupKey?: string | null;
  domain?: string;
  actor?: string;
  data?: Record<string, unknown>;
  priority?: "low" | "normal" | "high" | "critical";
  relatedConversationId?: string | null;
  relatedOrderId?: string | null;
  relatedPaymentIntentId?: string | null;
};

export async function sendInAppNotification(input: NotifyInput): Promise<string | null> {
  const payload = {
    user_id: input.userId,
    scope: input.domain ?? "global",
    category: input.type,
    title: input.title,
    body: input.body,
    severity: input.priority === "critical" ? "critical" : input.priority === "high" ? "warning" : "info",
    route: input.deepLink ?? null,
    entity_type: input.eventType ?? input.type,
    metadata: {
      actor: input.actor ?? "system",
      domain: input.domain ?? "system",
      data: input.data ?? {},
      dedup_key: input.dedupKey ?? null,
      related_conversation_id: input.relatedConversationId ?? null,
      related_order_id: input.relatedOrderId ?? null,
      related_payment_intent_id: input.relatedPaymentIntentId ?? null,
    },
  };

  const { data, error } = await db
    .from("app_notifications")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[notification-dispatcher] insert error:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function markNotificationRead(id: string): Promise<void> {
  await db
    .from("app_notifications")
    .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .from("app_notifications")
    .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}
