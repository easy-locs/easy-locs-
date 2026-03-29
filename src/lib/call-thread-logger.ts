/**
 * Inserts a system message into the conversation thread when a call event occurs.
 * Links call_logs to threads via system messages for unified communication history.
 * Uses canonical repository for DB ops.
 */
import { insertMessage } from "@/repositories/communication.repository";

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

const recentCallLogs = new Set<string>();

export async function logCallEventToThread(opts: {
  callId: string;
  threadId: string;
  orgId: string;
  senderId: string;
  event: CallEvent;
  durationSeconds?: number;
  contextId?: string;
}) {
  const dedupKey = `${opts.callId}:${opts.event}`;
  if (recentCallLogs.has(dedupKey)) return;
  recentCallLogs.add(dedupKey);
  setTimeout(() => recentCallLogs.delete(dedupKey), 10000);

  const content = EVENT_CONTENT[opts.event](opts.durationSeconds);
  const taggedContent = `${content} [call:${opts.event}:${opts.durationSeconds ?? 0}]`;

  await insertMessage({
    conversationId: opts.threadId,
    senderUserId: opts.senderId,
    senderOrbitId: `orbit_${opts.senderId.slice(0, 12)}`,
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

export function parseCallEvent(content: string): { event: string; durationSeconds: number } | null {
  const match = content.match(/\[call:(ended|declined|missed):(\d+)\]/);
  if (!match) return null;
  return { event: match[1], durationSeconds: parseInt(match[2], 10) };
}

export function cleanCallContent(content: string): string {
  return content.replace(/\s*\[call:[^\]]+\]/, "").trim();
}
