export type NotificationChannel = "in_app" | "push" | "email" | "sms" | "whatsapp";
export type NotificationCategory = "bookings" | "payments" | "messages" | "deals" | "documents" | "maintenance" | "news";

export interface ChannelPreferences {
  userId: string;
  in_app_bookings: boolean;
  in_app_payments: boolean;
  in_app_messages: boolean;
  in_app_deals: boolean;
  in_app_documents: boolean;
  in_app_maintenance: boolean;
  push_bookings: boolean;
  push_payments: boolean;
  push_messages: boolean;
  push_deals: boolean;
  push_documents: boolean;
  push_maintenance: boolean;
  email_bookings: boolean;
  email_payments: boolean;
  email_messages: boolean;
  email_deals: boolean;
  email_documents: boolean;
  email_maintenance: boolean;
  email_urgent_only: boolean;
  sms_bookings: boolean;
  sms_payments: boolean;
  sms_messages: boolean;
  sms_deals: boolean;
  sms_documents: boolean;
  sms_maintenance: boolean;
  whatsapp_bookings: boolean;
  whatsapp_payments: boolean;
  whatsapp_messages: boolean;
  whatsapp_deals: boolean;
  whatsapp_documents: boolean;
  whatsapp_maintenance: boolean;
  in_app_news: boolean;
  push_news: boolean;
  email_news: boolean;
  sms_news: boolean;
  whatsapp_news: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  updated_at: string;
}

export function getDefaultPreferences(userId: string): ChannelPreferences {
  return {
    userId,
    in_app_bookings: true,
    in_app_payments: true,
    in_app_messages: true,
    in_app_deals: true,
    in_app_documents: true,
    in_app_maintenance: true,
    push_bookings: true,
    push_payments: true,
    push_messages: true,
    push_deals: false,
    push_documents: false,
    push_maintenance: true,
    email_bookings: true,
    email_payments: true,
    email_messages: false,
    email_deals: false,
    email_documents: true,
    email_maintenance: true,
    email_urgent_only: false,
    sms_bookings: false,
    sms_payments: true,
    sms_messages: false,
    sms_deals: false,
    sms_documents: false,
    sms_maintenance: false,
    whatsapp_bookings: true,
    whatsapp_payments: true,
    whatsapp_messages: true,
    whatsapp_deals: false,
    whatsapp_documents: false,
    whatsapp_maintenance: false,
    in_app_news: true,
    push_news: false,
    email_news: false,
    sms_news: false,
    whatsapp_news: false,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
    quiet_hours_timezone: "UTC",
    updated_at: new Date().toISOString(),
  };
}

export function isChannelAllowed(
  prefs: ChannelPreferences,
  channel: NotificationChannel,
  category: NotificationCategory,
): boolean {
  const key = `${channel}_${category}` as keyof ChannelPreferences;
  return prefs[key] === true;
}

export function isInQuietHours(prefs: ChannelPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: prefs.quiet_hours_timezone,
    });
    const currentTime = formatter.format(now);
    const [currentH, currentM] = currentTime.split(":").map(Number);
    const currentMinutes = currentH * 60 + currentM;

    const [startH, startM] = prefs.quiet_hours_start.split(":").map(Number);
    const [endH, endM] = prefs.quiet_hours_end.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

export function shouldSendNotification(
  prefs: ChannelPreferences,
  channel: NotificationChannel,
  category: NotificationCategory,
  priority: "low" | "normal" | "high" | "critical" = "normal",
): boolean {
  if (priority === "critical") return true;

  if (!isChannelAllowed(prefs, channel, category)) return false;

  if (priority !== "high" && isInQuietHours(prefs)) return false;

  return true;
}

export function getEnabledChannels(
  prefs: ChannelPreferences,
  category: NotificationCategory,
): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  const allChannels: NotificationChannel[] = ["in_app", "push", "email", "sms", "whatsapp"];

  for (const ch of allChannels) {
    if (isChannelAllowed(prefs, ch, category)) {
      channels.push(ch);
    }
  }

  return channels;
}

export interface NotificationAnalytics {
  notificationId: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  status: "sent" | "delivered" | "opened" | "clicked" | "failed" | "bounced";
}

export function createAnalyticsEntry(
  notificationId: string,
  channel: NotificationChannel,
  category: NotificationCategory,
): NotificationAnalytics {
  return {
    notificationId,
    channel,
    category,
    sentAt: new Date().toISOString(),
    status: "sent",
  };
}

export const NOTIFICATION_PREFERENCE_COLUMNS_SQL = `
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_bookings BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_payments BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_messages BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_deals BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_documents BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_maintenance BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_bookings BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_payments BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_messages BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_deals BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_documents BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_maintenance BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_bookings BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_payments BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_messages BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_deals BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_documents BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_maintenance BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_urgent_only BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_bookings BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_payments BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_messages BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_deals BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_documents BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_maintenance BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_bookings BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_payments BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_messages BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_deals BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_documents BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_maintenance BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_news BOOLEAN DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_news BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_news BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS sms_news BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_news BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT '22:00';
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT '08:00';
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_timezone TEXT DEFAULT 'UTC';
`;
