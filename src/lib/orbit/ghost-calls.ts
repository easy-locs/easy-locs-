import { supabase } from "@/integrations/supabase/client";

export async function createGhostCallSession(params: {
  workspaceId?: string;
  createdBy?: string;
  chatSessionId?: string;
  callType?: "audio" | "video" | "screen";
  anonymityLevel?: "standard" | "high" | "ghost";
  relayMode?: "direct" | "relay" | "sealed" | "proxy";
  keyFingerprint?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("ghost_call_sessions")
    .insert({
      workspace_id: params.workspaceId ?? null,
      created_by: params.createdBy ?? null,
      chat_session_id: params.chatSessionId ?? null,
      call_type: params.callType ?? "audio",
      anonymity_level: params.anonymityLevel ?? "ghost",
      relay_mode: params.relayMode ?? "sealed",
      key_fingerprint: params.keyFingerprint ?? null,
      status: "created",
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addGhostCallParticipant(params: {
  callSessionId: string;
  identityId?: string;
  role?: "caller" | "callee" | "observer" | "translator";
  transportIdentity?: string;
}) {
  const { data, error } = await supabase
    .from("ghost_call_participants")
    .insert({
      call_session_id: params.callSessionId,
      identity_id: params.identityId ?? null,
      role: params.role ?? "participant",
      transport_identity: params.transportIdentity ?? null,
      status: "invited",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateGhostCallParticipant(
  participantId: string,
  patch: {
    status?: "invited" | "ringing" | "joined" | "left" | "failed";
    muteState?: boolean;
    videoState?: boolean;
    joinedAt?: string;
    leftAt?: string;
  }
) {
  const payload: Record<string, any> = {};
  if (patch.status) payload.status = patch.status;
  if (typeof patch.muteState === "boolean") payload.mute_state = patch.muteState;
  if (typeof patch.videoState === "boolean") payload.video_state = patch.videoState;
  if (patch.joinedAt) payload.joined_at = patch.joinedAt;
  if (patch.leftAt) payload.left_at = patch.leftAt;

  const { data, error } = await supabase
    .from("ghost_call_participants")
    .update(payload)
    .eq("id", participantId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function sendGhostCallSignal(params: {
  callSessionId: string;
  senderParticipantId?: string;
  signalType: "offer" | "answer" | "ice" | "rotate" | "control";
  payload: Record<string, any>;
  expiresAt?: string;
}) {
  const { data, error } = await supabase
    .from("ghost_call_signals")
    .insert({
      call_session_id: params.callSessionId,
      sender_participant_id: params.senderParticipantId ?? null,
      signal_type: params.signalType,
      payload: params.payload,
      expires_at: params.expiresAt ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export function subscribeGhostCallSignals(
  callSessionId: string,
  onSignal: (signal: any) => void
) {
  return supabase
    .channel(`ghost-call:${callSessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "ghost_call_signals",
        filter: `call_session_id=eq.${callSessionId}`,
      },
      (payload) => onSignal(payload.new)
    )
    .subscribe();
}
