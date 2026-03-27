/**
 * message-formatter.ts — Human-friendly formatting for system/event messages.
 * Converts raw event strings like "call:ended:0" into readable text.
 * NEVER display raw event keys to the user.
 */

const EVENT_MAP: Record<string, string> = {
  // Call events
  "call:ended": "Call ended",
  "call:missed": "Missed call",
  "call:incoming": "Incoming call",
  "call:outgoing": "Outgoing call",
  "call:declined": "Call declined",
  "call:busy": "Line busy",
  "call:cancelled": "Call cancelled",
  "call:no_answer": "No answer",
  "call:started": "Call started",
  "call:ringing": "Ringing…",

  // Message events
  "message:deleted": "Message deleted",
  "message:edited": "Message edited",

  // Group events
  "group:created": "Group created",
  "group:member_added": "Member added",
  "group:member_removed": "Member removed",
  "group:member_left": "Member left",
  "group:renamed": "Group renamed",

  // System events
  "system:welcome": "Welcome!",
  "system:encryption_enabled": "End-to-end encryption enabled",

  // Status
  ended: "Call ended",
  missed: "Missed call",
  declined: "Declined",
  cancelled: "Cancelled",
  busy: "Busy",
  no_answer: "No answer",
  ringing: "Ringing",
  in_progress: "In progress",
  completed: "Completed",
};

/**
 * Format a raw event/status string into human-readable text.
 * Strips trailing numeric suffixes (e.g. "call:ended:0" → "call:ended").
 */
export function formatEventMessage(raw: string | null | undefined): string {
  if (!raw) return "";

  // Strip trailing :number (e.g. "call:ended:0" → "call:ended")
  const cleaned = raw.replace(/:\d+$/, "").trim();

  // Direct lookup
  if (EVENT_MAP[cleaned]) return EVENT_MAP[cleaned];

  // Try lowercase
  const lower = cleaned.toLowerCase();
  if (EVENT_MAP[lower]) return EVENT_MAP[lower];

  // If it looks like a key (contains colons/dots), humanize
  if (/[:.]/.test(cleaned)) {
    const last = cleaned.split(/[:.]/g).pop() || cleaned;
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/_/g, " ");
  }

  // Already readable
  return cleaned;
}

/**
 * Format call status for display
 */
export function formatCallStatus(status: string): string {
  return EVENT_MAP[status] || formatEventMessage(status);
}

/**
 * Check if a string looks like a raw UUID
 */
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Safe display name — never show UUID to user
 */
export function safeDisplayName(
  name: string | null | undefined,
  fallback = "Unknown"
): string {
  if (!name) return fallback;
  if (isUUID(name)) return fallback;
  return name;
}
