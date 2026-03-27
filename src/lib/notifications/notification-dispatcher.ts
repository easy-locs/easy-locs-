/**
 * Canonical notification dispatcher — single entry point for all in-app notifications.
 * Uses the `notifications` table with dedup support.
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
    type: input.type,
    title: input.title,
    body: input.body,
    priority: input.priority ?? "normal",
    channel: "in_app",
    cta_url: input.deepLink ?? null,
    dedup_key: input.dedupKey ?? null,
    event_type: input.eventType ?? input.type,
    metadata_json: {
      actor: input.actor ?? "system",
      domain: input.domain ?? "system",
      data: input.data ?? {},
      related_conversation_id: input.relatedConversationId ?? null,
      related_order_id: input.relatedOrderId ?? null,
      related_payment_intent_id: input.relatedPaymentIntentId ?? null,
    },
  };

  const { data, error } = input.dedupKey
    ? await db
        .from("notifications")
        .upsert(payload, { onConflict: "user_id,dedup_key", ignoreDuplicates: true })
        .select("id")
        .single()
    : await db
        .from("notifications")
        .insert(payload)
        .select("id")
        .single();

  if (error) {
    // Dedupe conflict is expected
    if (error.code === "23505") return null;
    console.error("[notification-dispatcher] insert error:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function markNotificationRead(id: string): Promise<void> {
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString(), read: true })
    .eq("id", id)
    .is("read_at", null);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString(), read: true })
    .eq("user_id", userId)
    .is("read_at", null);
}
