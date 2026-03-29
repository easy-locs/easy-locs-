/**
 * FAMILY: TIME / LOCALE — Canonical time formatting for the entire app.
 * Single source of truth. NO component-local date/time formatting allowed.
 *
 * Hierarchy:
 *   HH:mm (today) → Yesterday → Weekday (this week) → dd/MM/yy (older)
 */

// ── Re-export canonical timestamp formatter ──
export {
  formatOrbitTimestamp,
  formatCallStatusLabel,
  formatConversationPreview,
} from "@/lib/orbit/canonical-helpers";

// ── Re-export i18n date formatting ──
export { formatDate } from "@/lib/i18n-engine";

// ── Canonical date separator logic (used by message lists) ──
import { format, isToday, isYesterday } from "date-fns";

export function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM/yyyy");
}

export function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return format(d, "HH:mm");
}

export function formatCallDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatVoiceDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
