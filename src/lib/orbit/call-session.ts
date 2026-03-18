/**
 * Orbit call session management — create, start, end, decline call sessions.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createCallSession(params: {
  threadId?: string | null;
  initiatorId: string;
  recipientId?: string | null;
  callType?: "voice" | "video";
}) {
  const { data, error } = await supabase
    .from("call_sessions" as any)
    .insert({
      thread_id: params.threadId ?? null,
      initiator_id: params.initiatorId,
      recipient_id: params.recipientId ?? null,
      call_type: params.callType ?? "voice",
      status: "ringing",
      metadata_json: { orbit: true, encrypted: true },
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function startCallSession(callId: string) {
  const { error } = await supabase
    .from("call_sessions" as any)
    .update({ status: "active", started_at: new Date().toISOString() } as any)
    .eq("id", callId);
  if (error) throw error;
  return { ok: true };
}

export async function endCallSession(callId: string, startedAt?: string | null) {
  const endedAt = new Date();
  const durationSeconds = startedAt
    ? Math.max(0, Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 1000))
    : 0;

  const { error } = await supabase
    .from("call_sessions" as any)
    .update({
      status: "ended",
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
    } as any)
    .eq("id", callId);
  if (error) throw error;
  return { ok: true, durationSeconds };
}

export async function declineCallSession(callId: string) {
  const { error } = await supabase
    .from("call_sessions" as any)
    .update({ status: "declined", ended_at: new Date().toISOString() } as any)
    .eq("id", callId);
  if (error) throw error;
  return { ok: true };
}
