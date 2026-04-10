/**
 * Orbit Engine Alerts — pure alert generation from counters.
 * No DB calls. No side effects.
 */
import type { OrbitAlert } from "./types";

interface AlertInput {
  pendingBookings: number;
  newLeads: number;
  pendingOrders: number;
  unreadMessages: number;
  missedCalls: number;
  pendingNotifications: number;
}

export function generateAlerts(state: AlertInput): OrbitAlert[] {
  const alerts: OrbitAlert[] = [];
  const now = Date.now();

  if (state.pendingBookings > 0)
    alerts.push({
      id: "pending-bookings", type: "action", priority: 1, icon: "📩",
      title: "Pending bookings",
      message: `${state.pendingBookings} booking${state.pendingBookings > 1 ? "s" : ""} to confirm`,
      link: "/dashboard/seasonal", timestamp: now,
    });

  if (state.newLeads > 0)
    alerts.push({
      id: "new-leads", type: "action", priority: 2, icon: "🔥",
      title: "New leads",
      message: `${state.newLeads} lead${state.newLeads > 1 ? "s" : ""} this week`,
      link: "/dashboard/communication", timestamp: now,
    });

  if (state.pendingOrders > 0)
    alerts.push({
      id: "pending-orders", type: "action", priority: 3, icon: "🎯",
      title: "Pending orders",
      message: `${state.pendingOrders} order${state.pendingOrders > 1 ? "s" : ""} pending`,
      link: "/dashboard/activities", timestamp: now,
    });

  if (state.unreadMessages > 0)
    alerts.push({
      id: "unread-msg", type: "info", priority: 4, icon: "💬",
      title: "Unread messages",
      message: `${state.unreadMessages} unread message${state.unreadMessages > 1 ? "s" : ""}`,
      link: "/dashboard/communication", timestamp: now,
    });

  if (state.missedCalls > 0)
    alerts.push({
      id: "missed-calls", type: "warning", priority: 5, icon: "📞",
      title: "Missed calls",
      message: `${state.missedCalls} missed call${state.missedCalls > 1 ? "s" : ""}`,
      link: "/dashboard/communication", timestamp: now,
    });

  if (state.pendingNotifications > 5)
    alerts.push({
      id: "notif-pile", type: "info", priority: 6, icon: "🔔",
      title: "Notifications",
      message: `${state.pendingNotifications} pending notification${state.pendingNotifications > 1 ? "s" : ""}`,
      link: "/dashboard/settings", timestamp: now,
    });

  return alerts.sort((a, b) => a.priority - b.priority);
}

export function computeUrgency(state: AlertInput): number {
  return (
    state.pendingBookings * 10 +
    state.pendingOrders * 8 +
    state.newLeads * 5 +
    state.missedCalls * 4 +
    state.unreadMessages * 2 +
    Math.min(state.pendingNotifications, 10) * 1
  );
}
