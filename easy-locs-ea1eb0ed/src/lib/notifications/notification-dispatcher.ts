/**
 * Canonical notification dispatcher — unified entry point for all notifications.
 *
 * Architecture:
 * - Client-side in-app: sendInAppNotification() → insertNotification() (RLS-protected direct write)
 * - Server-side multi-channel: edge functions call notification-dispatcher edge fn (service-role)
 *   which handles in_app + push + email + sms with preference checks and deduplication.
 *
 * Both paths write to the same app_notifications table. The edge function dispatcher
 * is the canonical multi-channel path; this module is the canonical client-side path.
 */
import {
  insertNotification,
  markAsRead,
  markAllAsRead,
  type NotificationInsert,
} from "@/lib/notification-service/notification-service";

type ActorType = NotificationInsert["actor"];
type DomainType = NotificationInsert["domain"];

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  deepLink?: string | null;
  eventType?: string | null;
  dedupKey?: string | null;
  domain?: DomainType;
  actor?: ActorType;
  data?: Record<string, unknown>;
  priority?: "low" | "normal" | "high" | "critical";
  relatedConversationId?: string | null;
  relatedOrderId?: string | null;
  relatedPaymentIntentId?: string | null;
};

export async function sendInAppNotification(input: NotifyInput): Promise<string | null> {
  return insertNotification({
    user_id: input.userId,
    actor: input.actor ?? "system",
    domain: input.domain ?? "system",
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

export interface MultiChannelNotifyInput {
  userId: string;
  eventType: string;
  title: string;
  body: string;
  channels?: ("in_app" | "push" | "email" | "sms")[];
  priority?: "low" | "normal" | "high" | "critical";
  data?: Record<string, any>;
  actionUrl?: string;
  entityId?: string;
  entityType?: string;
  dedupeKey?: string;
  locale?: string;
  emailTemplate?: string;
  smsPhone?: string;
}

export function buildDispatchPayload(input: MultiChannelNotifyInput): Record<string, any> {
  return {
    user_id: input.userId,
    event_type: input.eventType,
    title: input.title,
    body: input.body,
    channels: input.channels,
    priority: input.priority ?? "normal",
    data: input.data ?? {},
    action_url: input.actionUrl,
    entity_id: input.entityId,
    entity_type: input.entityType,
    dedupe_key: input.dedupeKey,
    locale: input.locale,
    email_template: input.emailTemplate,
    sms_phone: input.smsPhone,
  };
}

export async function checkMarketingConsent(
  userId: string,
  channel: "email" | "push" | "sms" | "in_app",
  notificationType: string,
): Promise<boolean> {
  const { db } = await import("@/services/db");

  const MARKETING_TYPES = ["promotions", "offers", "newsletter", "marketing", "product_updates"];
  const isMarketing = MARKETING_TYPES.some(t => notificationType.toLowerCase().includes(t));
  if (!isMarketing) return true;

  try {
    const { data: profile } = await db("profiles")
      .select("marketing_preferences")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.marketing_preferences) return false;
    const prefs = profile.marketing_preferences as Record<string, Record<string, boolean>>;
    const channelPrefs = prefs[channel];
    if (!channelPrefs) return false;

    const typeKey = MARKETING_TYPES.find(t => notificationType.toLowerCase().includes(t)) ?? "promotions";
    return channelPrefs[typeKey] === true;
  } catch {
    return false;
  }
}

export async function dispatchMultiChannel(input: MultiChannelNotifyInput): Promise<{ success: boolean; error?: string }> {
  const { db } = await import("@/services/db");

  let filteredChannels = input.channels ?? ["in_app", "push", "email"];

  const channelChecks = await Promise.all(
    filteredChannels.map(async (ch) => ({
      channel: ch,
      allowed: await checkMarketingConsent(input.userId, ch, input.eventType),
    }))
  );
  filteredChannels = channelChecks.filter(c => c.allowed).map(c => c.channel);

  if (filteredChannels.length === 0) {
    return { success: true, error: "All channels blocked by marketing preferences" };
  }

  const payload = buildDispatchPayload({ ...input, channels: filteredChannels });
  const { data, error } = await db.functions.invoke("notification-dispatcher", {
    body: payload,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
