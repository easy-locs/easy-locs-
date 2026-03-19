/**
 * Ghost Call Engine — Separate call coordinator for ghost identity.
 * Separate room_id namespace, signaling table, alias-based UI.
 */
import { supabase } from "@/integrations/supabase/client";
import { getGhostPolicy, GhostTier } from "./ghost-policy";

export async function startGhostCall(params: {
  callerGhostProfileId: string;
  calleeGhostProfileId: string;
  callerAlias: string;
  calleeAlias: string;
  tier: GhostTier;
  threadId?: string;
}) {
  const policy = getGhostPolicy(params.tier);
  const expiresAt = new Date(Date.now() + policy.sessionTtlMs).toISOString();

  const { data, error } = await supabase
    .from("ghost_call_sessions_v2")
    .insert({
      caller_ghost_profile_id: params.callerGhostProfileId,
      callee_ghost_profile_id: params.calleeGhostProfileId,
      caller_alias: params.callerAlias,
      callee_alias: params.calleeAlias,
      tier: params.tier,
      thread_id: params.threadId ?? null,
      status: "ringing",
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] call_started", { callId: data.id, roomId: data.room_id });
  return data;
}

export async function acceptGhostCall(callId: string) {
  const { data, error } = await supabase
    .from("ghost_call_sessions_v2")
    .update({
      status: "active",
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", callId)
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] call_accepted", { callId });
  return data;
}

export async function rejectGhostCall(callId: string) {
  const { data, error } = await supabase
    .from("ghost_call_sessions_v2")
    .update({
      status: "rejected",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", callId)
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] call_rejected", { callId });
  return data;
}

export async function endGhostCall(callId: string) {
  const { data, error } = await supabase
    .from("ghost_call_sessions_v2")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", callId)
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] call_ended", { callId });
  return data;
}

export async function sendGhostCallSignal(params: {
  callSessionId: string;
  senderGhostProfileId: string;
  receiverGhostProfileId: string;
  signalType: "offer" | "answer" | "ice" | "rotate" | "control" | "hangup";
  encryptedPayload: string;
  tier: GhostTier;
}) {
  const policy = getGhostPolicy(params.tier);
  const expiresAt = new Date(Date.now() + policy.antiReplayWindowMs).toISOString();

  const { data, error } = await supabase
    .from("ghost_call_signals_v2")
    .insert({
      call_session_id: params.callSessionId,
      sender_ghost_profile_id: params.senderGhostProfileId,
      receiver_ghost_profile_id: params.receiverGhostProfileId,
      signal_type: params.signalType,
      encrypted_payload: params.encryptedPayload,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] signal_sent", { type: params.signalType, callId: params.callSessionId });
  return data;
}

export function subscribeGhostCallSignals(
  callSessionId: string,
  myGhostProfileId: string,
  onSignal: (signal: any) => void
) {
  return supabase
    .channel(`ghost-call-sig:${callSessionId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "ghost_call_signals_v2",
      filter: `call_session_id=eq.${callSessionId}`,
    }, payload => {
      const sig = payload.new as any;
      // Only process signals meant for us
      if (sig.receiver_ghost_profile_id === myGhostProfileId || !sig.receiver_ghost_profile_id) {
        onSignal(sig);
      }
    })
    .subscribe();
}

export function cleanupGhostMedia(localStream?: MediaStream | null, remoteStream?: MediaStream | null) {
  localStream?.getTracks().forEach(t => t.stop());
  remoteStream?.getTracks().forEach(t => t.stop());
  console.log("[ghost] media_cleaned");
}
