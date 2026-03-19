/**
 * Call Session Service — CRUD for orbit_call_sessions + orbit_call_signals.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CallSessionRecord, CallType, SignalType } from "./call-types";

function randomRoomId(): string {
  return `room_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function createOutgoingCallSession(params: {
  callerUserId: string;
  calleeUserId: string;
  callType: CallType;
  e2eeKeyHint?: string;
}) {
  const roomId = randomRoomId();

  const { data, error } = await (supabase as any)
    .from("orbit_call_sessions")
    .insert({
      room_id: roomId,
      call_type: params.callType,
      caller_user_id: params.callerUserId,
      callee_user_id: params.calleeUserId,
      status: "ringing",
      e2ee_key_hint: params.e2eeKeyHint ?? null,
      metadata_json: {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CallSessionRecord;
}

export async function sendCallSignal(params: {
  sessionId: string;
  senderUserId: string;
  receiverUserId: string;
  signalType: SignalType;
  payload: Record<string, unknown>;
}) {
  const { error } = await (supabase as any)
    .from("orbit_call_signals")
    .insert({
      session_id: params.sessionId,
      sender_user_id: params.senderUserId,
      receiver_user_id: params.receiverUserId,
      signal_type: params.signalType,
      payload: params.payload,
    });

  if (error) throw error;
  return { ok: true };
}

export async function acceptCallSession(sessionId: string) {
  const { error } = await (supabase as any)
    .from("orbit_call_sessions")
    .update({
      status: "accepted",
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "ringing");

  if (error) throw error;
  return { ok: true };
}

export async function rejectCallSession(sessionId: string) {
  const { error } = await (supabase as any)
    .from("orbit_call_sessions")
    .update({
      status: "rejected",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw error;
  return { ok: true };
}

export async function endOrbitCallSession(sessionId: string) {
  const { error } = await (supabase as any)
    .from("orbit_call_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw error;
  return { ok: true };
}

export async function markSignalConsumed(signalId: string) {
  const { error } = await (supabase as any)
    .from("orbit_call_signals")
    .update({ consumed: true })
    .eq("id", signalId);

  if (error) throw error;
  return { ok: true };
}
