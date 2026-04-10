/**
 * notification-reader — SSOT adapter (read path).
 * All reads delegate to the canonical notification-service (notifications-v2 path).
 * Do NOT add direct Supabase calls here; use getUserNotifications / markAsRead / etc.
 */
import { reportHealth } from "@/lib/runtime/health-aggregator";
import {
  getUserNotifications,
  markAsRead,
  dismissNotification as svcDismiss,
  markAllAsRead,
} from "@/lib/notifications-v2/notification-service";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[NOTIFICATIONS][${step}] ${phase}:`, payload ?? {});
};

export async function fetchUnreadNotifications(userId: string, limit = 50) {
  trace("fetch.unread", "input", { userId, limit });
  const start = Date.now();

  try {
    const all = await getUserNotifications(userId, limit);
    const unread = all.filter((n) => n.read_at === null && n.dismissed_at === null);
    const latency = Date.now() - start;
    trace("fetch.unread", "output", { count: unread.length, latency });
    reportHealth("notifications", "ok", latency);
    return unread;
  } catch (err: any) {
    const latency = Date.now() - start;
    trace("fetch.unread", "error", { message: err?.message });
    reportHealth("notifications", "degraded", latency, err?.message);
    return [];
  }
}

export async function markNotificationRead(notificationId: string) {
  trace("markRead", "input", { notificationId });
  try {
    await markAsRead(notificationId);
    trace("markRead", "output", { success: true });
    return true;
  } catch {
    trace("markRead", "error", {});
    return false;
  }
}

export async function dismissNotification(notificationId: string) {
  trace("dismiss", "input", { notificationId });
  try {
    await svcDismiss(notificationId);
    return true;
  } catch {
    trace("dismiss", "error", {});
    return false;
  }
}

export async function markAllRead(userId: string) {
  trace("markAllRead", "input", { userId });
  try {
    await markAllAsRead(userId);
    trace("markAllRead", "output", { success: true });
    return true;
  } catch {
    trace("markAllRead", "error", {});
    return false;
  }
}
