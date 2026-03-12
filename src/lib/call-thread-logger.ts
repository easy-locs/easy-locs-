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
}) {
  const content = EVENT_CONTENT[opts.event](opts.durationSeconds);

  await supabase.from("messages").insert({
    org_id: opts.orgId,
    sender_id: opts.senderId,
    content,
    context_id: opts.threadId,
    context_type: "call",
    message_type: "system",
    read: false,
    metadata_json: {
      call_id: opts.callId,
      call_event: opts.event,
      duration_seconds: opts.durationSeconds ?? null,
    },
  } as any);
}
