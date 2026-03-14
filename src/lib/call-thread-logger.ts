/**
 * Inserts a system message into the conversation thread when a call event occurs.
 * Links call_logs to threads via system messages for unified communication history.
 */
import { supabase } from "@/integrations/supabase/client";

type CallEvent = "ended" | "declined" | "missed";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const EVENT_CONTENT: Record<CallEvent, (duration?: number) => string> = {
  ended: (d) => `📞 Call ended${d ? ` — ${formatDuration(d)}` : ""}`,
  declined: () => `📞 Call declined`,
  missed: () => `📞 Missed call`,
};

export async function logCallEventToThread(opts: {
  callId: string;
  threadId: string;
  orgId: string;
  senderId: string;
  event: CallEvent;
  durationSeconds?: number;
  contextId?: string;
}) {
  const content = EVENT_CONTENT[opts.event](opts.durationSeconds);

  // Use context_type = "call" to identify call events in the thread
  // Embed call metadata in the content tag for parsing
  const taggedContent = `${content} [call:${opts.event}:${opts.durationSeconds ?? 0}]`;

  // Use the thread's context_id (e.g. "direct:uuid:uuid") for proper matching
  // Also set thread_id FK for direct lookups
  await supabase.from("messages").insert({
    org_id: opts.orgId,
    sender_id: opts.senderId,
    content: taggedContent,
    context_id: opts.contextId || opts.threadId,
    context_type: "call",
    message_type: "system",
    thread_id: opts.threadId,
    read: false,
  } as any);
}

/** Parse call metadata from tagged content */
export function parseCallEvent(content: string): { event: string; durationSeconds: number } | null {
  const match = content.match(/\[call:(ended|declined|missed):(\d+)\]/);
  if (!match) return null;
  return { event: match[1], durationSeconds: parseInt(match[2], 10) };
}

/** Strip the call tag from content for display */
export function cleanCallContent(content: string): string {
  return content.replace(/\s*\[call:[^\]]+\]/, "").trim();
}
