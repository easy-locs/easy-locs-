/**
 * Secure Call Coordinator — Orchestrates hardened call lifecycle.
 * Wraps session creation, signaling, auth tokens, replay guard, and strict cleanup.
 */
import { supabase } from "@/integrations/supabase/client";
import { createCallAuthToken, revokeCallAuthTokens } from "./call-auth";
import { ensureCallDeviceIdentity } from "./call-device-identity";
import { getCallSecurityPolicy, type CallSecurityTier } from "./call-security-policy";
import { generateSignalNonce, checkSignalReplay, generateReplayGuardHash, resetReplayGuard } from "./call-replay-guard";
import { clearFrameEncryptionKey } from "./call-media-key";
import { logCallSecurityEvent } from "./call-security-events";
import { getRtcConfiguration } from "./get-hardened-rtc-config";

export interface SecureCallContext {
  sessionId: string;
  roomId: string;
  authToken: string;
  tier: CallSecurityTier;
  expiresAt: string;
}

// ─── UUID Validation ─────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidUUID(value: string, label: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`[call-vault] Invalid UUID for ${label}: ${value}`);
  }
}

// ─── Create Secure Session ───────────────────────────────

export async function createSecureCallSession(params: {
  callerId: string;
  calleeId: string;
  callType: "audio" | "video";
  tier?: CallSecurityTier;
}): Promise<SecureCallContext> {
  const tier = params.tier ?? "standard";
  const policy = getCallSecurityPolicy(tier);

  // Validate inputs
  assertValidUUID(params.callerId, "callerId");
  assertValidUUID(params.calleeId, "calleeId");

  if (params.callerId === params.calleeId) {
    throw new Error("[call-vault] Cannot call self");
  }

  // Ensure device identity
  await ensureCallDeviceIdentity(params.callerId);

  const roomId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + policy.roomExpiryMs).toISOString();
  const authContextHash = generateReplayGuardHash(roomId, params.callerId, params.calleeId);

  console.log("[call-vault] create_call_session_start", { roomId, tier, callType: params.callType });

  const { data: session, error } = await supabase
    .from("orbit_call_sessions")
    .insert({
      room_id: roomId,
      caller_user_id: params.callerId,
      callee_user_id: params.calleeId,
      call_type: params.callType,
      status: "created",
      security_tier: tier,
      auth_context_hash: authContextHash,
      expires_at: expiresAt,
    })
    .select("id, room_id")
    .single();

  if (error) throw error;

  // Issue auth token
  const { token } = await createCallAuthToken(params.callerId, roomId, "full", policy.authTokenTtlSeconds);

  console.log("[call-vault] create_call_session_success", { sessionId: session.id, roomId });

  return {
    sessionId: session.id,
    roomId: session.room_id,
    authToken: token,
    tier,
    expiresAt,
  };
}

// ─── Send Secure Signal ──────────────────────────────────

export async function sendSecureSignal(params: {
  sessionId: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  signalType: "offer" | "answer" | "ice" | "accept" | "reject" | "hangup";
  payload: Record<string, any>;
  tier: CallSecurityTier;
}) {
  const policy = getCallSecurityPolicy(params.tier);
  const nonce = generateSignalNonce();
  const timestamp = Date.now();

  // Anti-replay check
  const replayCheck = checkSignalReplay(nonce, params.tier);
  if (!replayCheck.allowed) {
    await logCallSecurityEvent({
      roomId: params.roomId,
      userId: params.senderId,
      eventType: "signal_replay_blocked",
      severity: "warn",
      detail: replayCheck.reason,
    });
    throw new Error(`Signal replay blocked: ${replayCheck.reason}`);
  }

  const replayHash = generateReplayGuardHash(params.roomId, nonce, params.senderId);
  const expiresAt = new Date(timestamp + policy.signalExpiryMs).toISOString();

  const { data, error } = await supabase
    .from("orbit_call_signals")
    .insert({
      session_id: params.sessionId,
      sender_id: params.senderId,
      receiver_id: params.receiverId,
      signal_type: params.signalType,
      payload: params.payload,
      nonce,
      expires_at: expiresAt,
      consumed: false,
      replay_guard_hash: replayHash,
    })
    .select("id")
    .single();

  if (error) throw error;
  console.log("[call-vault] signal_sent", { type: params.signalType, nonce: nonce.slice(0, 8) });
  return data;
}

// ─── Strict Media Cleanup ────────────────────────────────

export function strictMediaCleanup(params: {
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  peerConnection?: RTCPeerConnection | null;
  localVideoEl?: HTMLVideoElement | null;
  remoteVideoEl?: HTMLVideoElement | null;
  remoteAudioEl?: HTMLAudioElement | null;
}) {
  console.log("[call-vault] media_cleanup_start");

  // Stop local tracks
  if (params.localStream) {
    params.localStream.getTracks().forEach(t => {
      t.stop();
      console.log(`[call-vault] ${t.kind}_stopped`);
    });
  }

  // Stop remote tracks
  if (params.remoteStream) {
    params.remoteStream.getTracks().forEach(t => {
      t.stop();
    });
    console.log("[call-vault] remote_tracks_stopped");
  }

  // Clear video elements
  if (params.localVideoEl) params.localVideoEl.srcObject = null;
  if (params.remoteVideoEl) params.remoteVideoEl.srcObject = null;
  if (params.remoteAudioEl) {
    params.remoteAudioEl.srcObject = null;
    params.remoteAudioEl.remove();
  }

  // Close peer connection
  if (params.peerConnection) {
    params.peerConnection.close();
    console.log("[call-vault] pc_closed");
  }

  // Destroy media key material
  clearFrameEncryptionKey();
  resetReplayGuard();

  console.log("[call-vault] media_cleanup_complete");
}

// ─── End Secure Call ─────────────────────────────────────

export async function endSecureCall(
  sessionId: string,
  roomId: string,
  userId: string,
  cleanupParams?: Parameters<typeof strictMediaCleanup>[0]
) {
  // Cleanup media first
  if (cleanupParams) {
    strictMediaCleanup(cleanupParams);
  }

  // Revoke auth tokens
  await revokeCallAuthTokens(userId, roomId);

  // Update session
  await supabase
    .from("orbit_call_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  console.log("[call-vault] call_ended_securely", { sessionId, roomId });
}

// ─── Get Secure RTC Config ──────────────────────────────

export { getRtcConfiguration } from "./get-hardened-rtc-config";
