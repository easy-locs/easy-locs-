import { supabase } from "@/integrations/supabase/client";
import { createCallSystemMessage } from "@/lib/chat/createCallSystemMessage";

export async function createCallLog(input: {
  conversationId: string;
  callerOrbitId: string;
  receiverOrbitId: string;
  callType: "audio" | "video";
  status: "ringing" | "answered" | "missed" | "rejected" | "ended";
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSec?: number;
}) {
  const row = {
    id: `calllog_${Math.random().toString(36).slice(2, 11)}`,
    conversation_id: input.conversationId,
    caller_orbit_id: input.callerOrbitId,
    receiver_orbit_id: input.receiverOrbitId,
    call_type: input.callType,
    status: input.status,
    started_at: input.startedAt ?? null,
    answered_at: input.answeredAt ?? null,
    ended_at: input.endedAt ?? null,
    duration_sec: input.durationSec ?? 0,
  };

  const { data, error } = await supabase
    .from("call_logs")
    .insert(row as any)
    .select("*")
    .single();

  if (error) {
    console.error("createCallLog error", error);
    throw error;
  }

  // Also insert a call system message into chat
  await createCallSystemMessage({
    conversationId: input.conversationId,
    senderOrbitId: input.callerOrbitId,
    body: input.callType === "video"
      ? `Video call ${input.status}`
      : `Voice call ${input.status}`,
    metadata: {
      callType: input.callType,
      status: input.status,
      durationSec: input.durationSec ?? 0,
    },
  });

  return data;
}
