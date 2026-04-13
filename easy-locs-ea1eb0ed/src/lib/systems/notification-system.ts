import { platformBus } from "@/lib/shared/platform-bus";

export type NotificationChannel = "push" | "in_app" | "sms" | "email" | "whatsapp";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type NotificationCategory = "order" | "payment" | "chat" | "delivery" | "promotion" | "system" | "security" | "social" | "reminder" | "support";

export interface NotificationTemplate {
  templateId: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  titleKey: string;
  bodyKey: string;
  actionRoute: string | null;
  groupable: boolean;
  groupKey: string | null;
  throttleMinutes: number;
  quietHoursRespect: boolean;
}

export interface NotificationPreferences {
  userId: string;
  enabledChannels: NotificationChannel[];
  enabledCategories: NotificationCategory[];
  quietHours: { start: string; end: string; timezone: string } | null;
  doNotDisturb: boolean;
  emailDigest: "immediate" | "daily" | "weekly" | "none";
}

export interface ScheduledNotification {
  notificationId: string;
  recipientId: string;
  templateId: string;
  variables: Record<string, string>;
  scheduledAt: number;
  channels: NotificationChannel[];
  status: "scheduled" | "sent" | "delivered" | "failed" | "cancelled";
}

const TEMPLATES: NotificationTemplate[] = [
  { templateId: "order_confirmed", category: "order", channels: ["push", "in_app", "email"], priority: "high", titleKey: "notification.order.confirmed.title", bodyKey: "notification.order.confirmed.body", actionRoute: "/orders/:orderId", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: false },
  { templateId: "order_shipped", category: "delivery", channels: ["push", "in_app"], priority: "high", titleKey: "notification.delivery.shipped.title", bodyKey: "notification.delivery.shipped.body", actionRoute: "/orders/:orderId/tracking", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: false },
  { templateId: "order_delivered", category: "delivery", channels: ["push", "in_app"], priority: "normal", titleKey: "notification.delivery.delivered.title", bodyKey: "notification.delivery.delivered.body", actionRoute: "/orders/:orderId", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: false },
  { templateId: "payment_received", category: "payment", channels: ["push", "in_app"], priority: "high", titleKey: "notification.payment.received.title", bodyKey: "notification.payment.received.body", actionRoute: "/wallet", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: false },
  { templateId: "payment_failed", category: "payment", channels: ["push", "in_app", "email"], priority: "critical", titleKey: "notification.payment.failed.title", bodyKey: "notification.payment.failed.body", actionRoute: "/wallet", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: false },
  { templateId: "new_message", category: "chat", channels: ["push", "in_app"], priority: "normal", titleKey: "notification.chat.new_message.title", bodyKey: "notification.chat.new_message.body", actionRoute: "/orbit/chat/:threadId", groupable: true, groupKey: "chat_:threadId", throttleMinutes: 1, quietHoursRespect: true },
  { templateId: "new_review", category: "social", channels: ["in_app"], priority: "low", titleKey: "notification.social.review.title", bodyKey: "notification.social.review.body", actionRoute: "/me/reviews", groupable: true, groupKey: "reviews", throttleMinutes: 30, quietHoursRespect: true },
  { templateId: "promo_campaign", category: "promotion", channels: ["push", "in_app", "email"], priority: "low", titleKey: "notification.promo.title", bodyKey: "notification.promo.body", actionRoute: null, groupable: false, groupKey: null, throttleMinutes: 1440, quietHoursRespect: true },
  { templateId: "security_alert", category: "security", channels: ["push", "in_app", "email", "sms"], priority: "critical", titleKey: "notification.security.alert.title", bodyKey: "notification.security.alert.body", actionRoute: "/settings/security", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: false },
  { templateId: "kyc_approved", category: "system", channels: ["push", "in_app", "email"], priority: "high", titleKey: "notification.kyc.approved.title", bodyKey: "notification.kyc.approved.body", actionRoute: "/me", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: false },
  { templateId: "support_reply", category: "support", channels: ["push", "in_app"], priority: "normal", titleKey: "notification.support.reply.title", bodyKey: "notification.support.reply.body", actionRoute: "/settings/support/:ticketId", groupable: false, groupKey: null, throttleMinutes: 0, quietHoursRespect: true },
  { templateId: "abandoned_cart", category: "reminder", channels: ["push", "in_app"], priority: "low", titleKey: "notification.reminder.cart.title", bodyKey: "notification.reminder.cart.body", actionRoute: "/checkout", groupable: false, groupKey: null, throttleMinutes: 120, quietHoursRespect: true },
  { templateId: "low_stock_seller", category: "system", channels: ["push", "in_app"], priority: "normal", titleKey: "notification.seller.low_stock.title", bodyKey: "notification.seller.low_stock.body", actionRoute: "/me/shop/inventory", groupable: true, groupKey: "low_stock", throttleMinutes: 60, quietHoursRespect: true },
];

export function getTemplate(templateId: string): NotificationTemplate | undefined {
  return TEMPLATES.find((t) => t.templateId === templateId);
}

export function shouldSendOnChannel(
  template: NotificationTemplate,
  prefs: NotificationPreferences,
  channel: NotificationChannel
): boolean {
  if (prefs.doNotDisturb && template.quietHoursRespect) return false;
  if (!prefs.enabledChannels.includes(channel)) return false;
  if (!prefs.enabledCategories.includes(template.category)) return false;
  if (!template.channels.includes(channel)) return false;
  return true;
}

export function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHours) return false;
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const [startH, startM] = prefs.quietHours.start.split(":").map(Number);
  const [endH, endM] = prefs.quietHours.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function resolveChannels(
  template: NotificationTemplate,
  prefs: NotificationPreferences
): NotificationChannel[] {
  if (template.priority === "critical") return template.channels;
  if (isInQuietHours(prefs) && template.quietHoursRespect) return ["in_app"];
  return template.channels.filter((ch) => shouldSendOnChannel(template, prefs, ch));
}

export function emitNotification(recipientId: string, templateId: string, variables: Record<string, string>): void {
  const template = getTemplate(templateId);
  if (!template) return;
  platformBus.emit("notification:created", {
    recipientId,
    type: template.category,
    title: template.titleKey,
    body: template.bodyKey,
    route: template.actionRoute,
    templateId,
    variables,
    priority: template.priority,
  }, "notification-system");
}

export function emitBatchNotification(recipientIds: string[], templateId: string, variables: Record<string, string>): void {
  for (const recipientId of recipientIds) {
    emitNotification(recipientId, templateId, variables);
  }
}
