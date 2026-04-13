/**
 * Canonical notification dispatcher — single entry point for all in-app notifications.
 * Delegates ALL writes to the canonical V2 notification-service (SSOT).
 * No direct Supabase calls — prevents duplicate write paths.
 */
import {
  insertNotification,
  markAsRead,
  markAllAsRead,
} from "@/lib/notification-service/notification-service";

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
  return insertNotification({
    user_id: input.userId,
    actor: (input.actor as any) ?? "system",
    domain: (input.domain as any) ?? "system",
    type: input.eventType ?? input.type,
    title: input.title,
    body: input.body,
    priority: input.priority ?? "normal",
    action_url: input.deepLink ?? undefined,
    dedupe_key: input.dedupKey ?? undefined,
    related_conversation_id: input.relatedConversationId ?? undefined,
    related_order_id: input.relatedOrderId ?? undefined,
    related_payment_intent_id: input.relatedPaymentIntentId ?? undefined,
    data: {
      ...(input.data ?? {}),
    },
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await markAsRead(id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await markAllAsRead(userId);
}
