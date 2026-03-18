/**
 * Orbit Notification Engine — Smart contextual push with priority tiers.
 * 
 * Features:
 * - Priority system: critical > high > medium > low
 * - Ghost mode masking (content hidden)
 * - Dynamic grouping by context
 * - Rate limiting per context
 * - Sound/haptic differentiation
 */
import { haptic } from "@/lib/haptics";

// ─── Priority Tiers ──────────────────────────────────────

export type NotificationPriority = "critical" | "high" | "medium" | "low";

export interface OrbitNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  /** Ghost-safe version (masked content) */
  ghostBody?: string;
  contextType?: string;
  contextId?: string;
  route?: string;
  senderId?: string;
  senderName?: string;
  groupKey?: string;
  timestamp: number;
  read: boolean;
  resolved: boolean;
}

export type NotificationType =
  | "incoming_call"
  | "payment_received"
  | "payment_request"
  | "delivery_update"
  | "ride_update"
  | "booking_confirmed"
  | "rent_due"
  | "message"
  | "order_update"
  | "system"
  | "security_alert";

// ─── Priority Configuration ──────────────────────────────

const PRIORITY_MAP: Record<NotificationType, NotificationPriority> = {
  incoming_call: "critical",
  security_alert: "critical",
  payment_received: "high",
  payment_request: "high",
  delivery_update: "high",
  ride_update: "high",
  rent_due: "high",
  booking_confirmed: "medium",
  order_update: "medium",
  message: "medium",
  system: "low",
};

const PRIORITY_SOUNDS: Record<NotificationPriority, string> = {
  critical: "urgent",
  high: "alert",
  medium: "default",
  low: "silent",
};

const PRIORITY_HAPTICS: Record<NotificationPriority, "heavy" | "medium" | "light" | "success"> = {
  critical: "heavy",
  high: "medium",
  medium: "light",
  low: "light",
};

// ─── Rate Limiting ────────────────────────────────────────

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 5000;

function isRateLimited(key: string): boolean {
  const last = rateLimitMap.get(key) || 0;
  if (Date.now() - last < RATE_LIMIT_WINDOW_MS) return true;
  rateLimitMap.set(key, Date.now());
  return false;
}

// ─── Ghost Mode Masking ──────────────────────────────────

function maskForGhost(notification: OrbitNotification): OrbitNotification {
  return {
    ...notification,
    title: "New notification",
    body: notification.ghostBody || "You have a new notification",
    senderName: undefined,
  };
}

// ─── Notification Grouping ────────────────────────────────

export function groupNotifications(notifications: OrbitNotification[]): Map<string, OrbitNotification[]> {
  const groups = new Map<string, OrbitNotification[]>();
  for (const n of notifications) {
    const key = n.groupKey || n.type;
    const group = groups.get(key) || [];
    group.push(n);
    groups.set(key, group);
  }
  return groups;
}

// ─── Core Engine ──────────────────────────────────────────

type NotificationHandler = (notification: OrbitNotification) => void;
const handlers = new Set<NotificationHandler>();
const notificationQueue: OrbitNotification[] = [];

export function onNotification(handler: NotificationHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function getNotificationQueue(): OrbitNotification[] {
  return [...notificationQueue];
}

export function pushNotification(
  type: NotificationType,
  opts: {
    title: string;
    body: string;
    ghostBody?: string;
    contextType?: string;
    contextId?: string;
    route?: string;
    senderId?: string;
    senderName?: string;
    groupKey?: string;
  },
  isGhostMode = false,
): OrbitNotification {
  const priority = PRIORITY_MAP[type] || "medium";
  const rateLimitKey = `${type}:${opts.contextId || "global"}`;

  const notification: OrbitNotification = {
    id: crypto.randomUUID(),
    type,
    priority,
    title: opts.title,
    body: opts.body,
    ghostBody: opts.ghostBody,
    contextType: opts.contextType,
    contextId: opts.contextId,
    route: opts.route,
    senderId: opts.senderId,
    senderName: opts.senderName,
    groupKey: opts.groupKey || opts.contextType,
    timestamp: Date.now(),
    read: false,
    resolved: false,
  };

  // Rate limit non-critical notifications
  if (priority !== "critical" && isRateLimited(rateLimitKey)) {
    // Still queue, but don't fire haptic/sound
    notificationQueue.push(notification);
    return notification;
  }

  // Ghost mode masking
  const displayNotification = isGhostMode ? maskForGhost(notification) : notification;

  // Haptic feedback based on priority
  haptic(PRIORITY_HAPTICS[priority]);

  // Queue and notify
  notificationQueue.push(notification);
  if (notificationQueue.length > 200) notificationQueue.splice(0, 50);

  handlers.forEach(h => h(displayNotification));

  return notification;
}

export function markRead(notificationId: string) {
  const n = notificationQueue.find(n => n.id === notificationId);
  if (n) n.read = true;
}

export function markResolved(notificationId: string) {
  const n = notificationQueue.find(n => n.id === notificationId);
  if (n) {
    n.read = true;
    n.resolved = true;
  }
}

export function getUnreadCount(): number {
  return notificationQueue.filter(n => !n.read).length;
}

export function getUnreadByPriority(): Record<NotificationPriority, number> {
  const counts: Record<NotificationPriority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const n of notificationQueue) {
    if (!n.read) counts[n.priority]++;
  }
  return counts;
}
