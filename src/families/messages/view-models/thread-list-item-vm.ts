/**
 * ThreadListItemViewModel — Canonical VM for conversation list rows.
 * UI never reads raw thread data directly.
 */
import { orbitLabels } from "@/families/orbit-i18n/orbit-labels";

export interface ThreadListItemViewModel {
  id: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageTime: string | null;
  relativeTime: string;
  unreadCount: number;
  hasUnread: boolean;
  isOnline: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isGroup: boolean;
  /** Delivery status of last outgoing message */
  deliveryStatus: "none" | "sending" | "sent" | "delivered" | "read";
}

/**
 * Format a timestamp to relative time string.
 */
export function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return orbitLabels.time.now;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Build a ThreadListItemViewModel from raw thread data.
 */
export function toThreadListItemVM(raw: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
  isOnline?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  isGroup?: boolean;
  deliveryStatus?: "none" | "sending" | "sent" | "delivered" | "read";
}): ThreadListItemViewModel {
  return {
    id: raw.id,
    name: raw.name,
    avatarUrl: raw.avatarUrl ?? null,
    lastMessage: raw.lastMessage || "",
    lastMessageTime: raw.lastMessageTime ?? null,
    relativeTime: formatRelativeTime(raw.lastMessageTime),
    unreadCount: raw.unreadCount || 0,
    hasUnread: (raw.unreadCount || 0) > 0,
    isOnline: raw.isOnline ?? false,
    isMuted: raw.isMuted ?? false,
    isPinned: raw.isPinned ?? false,
    isArchived: raw.isArchived ?? false,
    isGroup: raw.isGroup ?? false,
    deliveryStatus: raw.deliveryStatus ?? "none",
  };
}
