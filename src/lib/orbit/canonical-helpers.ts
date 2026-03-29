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
  if (isYesterday(d)) return "Yesterday";
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
export function formatConversationPreview(lastMessage?: string | null, fallbackEmail?: string | null): string {
  if (!lastMessage) return fallbackEmail || "—";
  // Strip metadata tags like [system] etc
  const cleaned = lastMessage.replace(/\s*\[[^\]]+\]/g, "").trim();
  if (!cleaned) return fallbackEmail || "—";
  return cleaned.length > 60 ? cleaned.slice(0, 57) + "…" : cleaned;
}

// ── Canonical Display Identity ──
export interface CanonicalDisplayIdentity {
  displayName: string;
  subtitle: string;
  avatarUrl: string | null;
  initials: string;
  /** Pass-through canonical IDs when available */
  canonicalUserId?: string | null;
  canonicalOrbitId?: string | null;
}

export function resolveCanonicalDisplayIdentity(entity: {
  display_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  role?: string | null;
  id?: string | null;
  user_id?: string | null;
  orbit_id?: string | null;
}): CanonicalDisplayIdentity {
  const name = entity.display_name || entity.name || null;
  const email = entity.email || null;
  const phone = entity.phone || null;

  const displayName = name || email || phone || "Contact";

  const subtitle = name
    ? (entity.company || entity.role || email || "")
    : (entity.company || entity.role || phone || "");

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
