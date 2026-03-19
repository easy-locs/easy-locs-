import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import type { CallSessionRecord, CallType, SignalType } from "./call-types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUserId(input: string): Promise<string> {
  if (UUID_RE.test(input)) return input;

  // Treat as email — look up profile
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", input)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(`Cannot resolve user for "${input}". No matching profile found.`);
  }

  debugLog.info("call", "resolved_email_to_uuid", `${input} → ${data.id}`);
  return data.id;
}

export async function createCallSession(params: {
  callerUserId: string;
  calleeUserId: string;
  callType: CallType;
}): Promise<CallSessionRecord> {
  // Resolve callee — may be email or UUID
  const calleeUuid = await resolveUserId(params.calleeUserId);
  const callerUuid = await resolveUserId(params.callerUserId);

  debugLog.info("call", "create_call_session_start", `${callerUuid} -> ${calleeUuid}`, {
    ...params,
    callerUuid,
    calleeUuid,
  });

  const roomId = crypto.randomUUID();
  debugLog.info("call", "room_created", roomId);

  const { data, error } = await (supabase as any)
    .from("orbit_call_sessions")
    .insert({
      caller_user_id: callerUuid,
      callee_user_id: calleeUuid,
      call_type: params.callType,
      status: "ringing",
      room_id: roomId,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    debugLog.error("call", "create_call_session_error", error.message);
    throw error;
  }

  debugLog.success("call", "create_call_session_success", data.id, data);
  return data as CallSessionRecord;
}

export async function sendCallSignal(params: {
  sessionId: string;
  senderUserId: string;
  receiverUserId: string;
  signalType: SignalType;
  payload: Record<string, unknown>;
}) {
  debugLog.info("call", "send_signal_start", params.signalType, {
    sessionId: params.sessionId,
    senderUserId: params.senderUserId,
    receiverUserId: params.receiverUserId,
  });

  const { error } = await (supabase as any)
    .from("orbit_call_signals")
    .insert({
      session_id: params.sessionId,
      sender_user_id: params.senderUserId,
      receiver_user_id: params.receiverUserId,
      signal_type: params.signalType,
      payload: params.payload,
    });

  if (error) {
    debugLog.error("call", "send_signal_error", error.message, params);
    throw error;
  }

  debugLog.success("call", "send_signal_success", params.signalType, {
    sessionId: params.sessionId,
  });

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
