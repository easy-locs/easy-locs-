/**
 * Canonical Orbit Helpers — Single source of truth for identity display, timestamps, and previews.
 */
import { format, isToday, isYesterday } from "date-fns";

// ── Canonical Timestamp ──
export function formatOrbitTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday"; // i18n applied at UI layer via t("common.yesterday")
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return format(d, "EEEE");
  return format(d, "dd/MM/yy");
}

// ── Canonical Call Status ──
export function formatCallStatusLabel(status: string, duration?: number | null): string {
  switch (status) {
    case "missed": return "Missed";
    case "declined": return "Declined";
    case "ended":
      if (duration && duration > 0) {
        if (duration < 60) return `${duration}s`;
        const m = Math.floor(duration / 60);
        const s = duration % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
      }
      return "Ended";
    case "answered": return "Answered";
    case "ringing": return "Ringing";
    case "busy": return "Busy";
    default: return status || "";
  }
}

// ── Canonical Conversation Preview ──
export function formatConversationPreview(lastMessage?: string | null, _fallback?: string | null): string {
  if (!lastMessage) return "—";
  const cleaned = lastMessage.replace(/\s*\[[^\]]+\]/g, "").trim();
  if (!cleaned) return "—";
  return cleaned.length > 60 ? cleaned.slice(0, 57) + "…" : cleaned;
}

// ── Canonical Display Identity ──
export interface CanonicalDisplayIdentity {
  displayName: string;
  subtitle: string;
  avatarUrl: string | null;
  initials: string;
  canonicalUserId?: string | null;
  canonicalOrbitId?: string | null;
}

export function resolveCanonicalDisplayIdentity(entity: {
  display_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  role?: string | null;
  id?: string | null;
  user_id?: string | null;
  orbit_id?: string | null;
  username?: string | null;
}): CanonicalDisplayIdentity {
  const compositeName = [entity.first_name, entity.last_name].filter(Boolean).join(" ") || null;
  const name = entity.display_name || entity.name || compositeName || entity.username || null;
  const phone = entity.phone || null;

  const displayName = name || (entity.email ? entity.email.split("@")[0] : null) || phone || "Contact";

  const subtitle = entity.company || entity.role || "";

  const avatarUrl = entity.avatar_url || entity.avatarUrl || null;

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() || "?";

  return {
    displayName,
    subtitle,
    avatarUrl,
    initials,
    canonicalUserId: entity.user_id || entity.id || null,
    canonicalOrbitId: entity.orbit_id || null,
  };
}

// ── Canonical Peer Identity (calls, headers, cards, notifications) ──
export interface PeerIdentity {
  userId: string | null;
  orbitId: string | null;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  email: string | null;
  phone: string | null;
  isKnownContact: boolean;
  isMe: boolean;
}

function buildInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() || "?";
}

/**
 * resolvePeerIdentity — SINGLE source of truth for the peer in a call or conversation.
 * Fallback chain: thread.name → email → "Contact"
 *
 * Use EVERYWHERE: call cards, incoming call bar, call history, mini player,
 * security panel, notifications, headers, avatars.
 */
export function resolvePeerIdentity(
  thread: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    peerUserId?: string | null;
    peerOrbitId?: string | null;
  } | null | undefined,
  currentUserId?: string | null,
): PeerIdentity {
  if (!thread) {
    return { userId: null, orbitId: null, displayName: "Contact", avatarUrl: null, initials: "?", email: null, phone: null, isKnownContact: false, isMe: false };
  }

  const hasName = !!thread.name && thread.name !== "Contact";
  const displayName = thread.name || "Contact";
  const avatarUrl = thread.avatarUrl || thread.avatar_url || null;

  return {
    userId: thread.peerUserId || null,
    orbitId: thread.peerOrbitId || null,
    displayName,
    avatarUrl,
    initials: buildInitials(displayName),
    email: thread.email || null,
    phone: thread.phone || null,
    isKnownContact: hasName,
    isMe: !!(currentUserId && thread.peerUserId === currentUserId),
  };
}

// ── Callable Peer (for call initiation) ──
export interface CallablePeer extends PeerIdentity {
  callTargetId: string | null;
}

/**
 * resolveCallablePeer — extends PeerIdentity with the target ID for call signaling.
 */
export function resolveCallablePeer(
  thread: Parameters<typeof resolvePeerIdentity>[0],
  currentUserId?: string | null,
): CallablePeer {
  const peer = resolvePeerIdentity(thread, currentUserId);
  return {
    ...peer,
    callTargetId: peer.orbitId || peer.userId || null,
  };
}

// ── Notification Identity ──
export interface NotificationIdentity {
  displayName: string;
  avatarUrl: string | null;
  initials: string;
}

/**
 * resolveNotificationIdentity — subset of PeerIdentity for notification rendering.
 */
export function resolveNotificationIdentity(
  thread: Parameters<typeof resolvePeerIdentity>[0],
): NotificationIdentity {
  const peer = resolvePeerIdentity(thread);
  return {
    displayName: peer.displayName,
    avatarUrl: peer.avatarUrl,
    initials: peer.initials,
  };
}
