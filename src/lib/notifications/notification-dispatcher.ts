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

  // If dedup_key is set, try upsert; handle conflict gracefully
  if (input.dedupKey) {
    const { data, error } = await db
      .from("notifications")
      .upsert(payload, { onConflict: "user_id,dedup_key", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();

    if (error) {
      // Unique constraint violation — already exists, read it back
      if (error.code === "23505") {
        return await readExistingByDedup(input.userId, input.dedupKey!);
      }
      console.error("[notification-dispatcher] upsert error:", error.message);
      return null;
    }

    // ignoreDuplicates may return null data when row already existed
    if (data?.id) return data.id;
    return await readExistingByDedup(input.userId, input.dedupKey!);
  }

  // No dedup — simple insert
  const { data, error } = await db
    .from("notifications")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[notification-dispatcher] insert error:", error.message);
    return null;
  }

  return data?.id ?? null;
}

/** Fallback read for dedup conflicts — deterministic */
async function readExistingByDedup(userId: string, dedupKey: string): Promise<string | null> {
  const { data } = await db
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("dedup_key", dedupKey)
    .maybeSingle();
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
