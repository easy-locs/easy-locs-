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

  // V2 CANONICAL — write call event as system message in chat_messages_v2
  // threadId here maps to a conversations_v2.id
  await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: opts.threadId,
    sender_user_id: opts.senderId,
    sender_orbit_id: `orbit_${opts.senderId.slice(0, 12)}`,
    type: "system",
    body: taggedContent,
    metadata: {
      call_id: opts.callId,
      call_event: opts.event,
      duration_seconds: opts.durationSeconds ?? 0,
      context_id: opts.contextId || opts.threadId,
    },
  });
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
