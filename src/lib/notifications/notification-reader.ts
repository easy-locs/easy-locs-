/**
 * notification-reader — Atomic unit: read and manage notification state.
 * Single responsibility: fetch + mark-read + dismiss notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[NOTIFICATIONS][${step}] ${phase}:`, payload ?? {});
};

export async function fetchUnreadNotifications(userId: string, limit = 50) {
  trace("fetch.unread", "input", { userId, limit });
  const start = Date.now();

  const { data, error } = await supabase
    .from("app_notifications")
    .select("*")
    .eq("user_id", userId)
    .is("read_at", null)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  const latency = Date.now() - start;
  if (error) {
    trace("fetch.unread", "error", { message: error.message });
    reportHealth("notifications", "degraded", latency, error.message);
    return [];
  }

  trace("fetch.unread", "output", { count: data?.length ?? 0, latency });
  reportHealth("notifications", "ok", latency);
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  trace("markRead", "input", { notificationId });
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    trace("markRead", "error", { message: error.message });
    return false;
  }
  trace("markRead", "output", { success: true });
  return true;
}

export async function dismissNotification(notificationId: string) {
  trace("dismiss", "input", { notificationId });
  const { error } = await supabase
    .from("app_notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    trace("dismiss", "error", { message: error.message });
    return false;
  }
  return true;
}

export async function markAllRead(userId: string) {
  trace("markAllRead", "input", { userId });
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    trace("markAllRead", "error", { message: error.message });
    return false;
  }
  trace("markAllRead", "output", { success: true });
  return true;
}
