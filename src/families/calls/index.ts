/**
 * FAMILY: CALLS — Canonical call state, actions, history, lifecycle, audio, privacy.
 * Single source of truth for all call-related logic.
 * All DB ops go through communication.repository (zero inline supabase).
 */

// ── Call State & Actions ──
export { useOrbitCallState } from "@/hooks/useOrbitCallState";
export { useOrbitCallActions } from "@/hooks/useOrbitCallActions";
export { useOrbitCallHistory } from "@/hooks/useOrbitCallHistory";
export { useOrbitDevicePermissions } from "@/hooks/useOrbitDevicePermissions";
export { useThreadCallFamily } from "@/hooks/orbit/families/useThreadCallFamily";
export { formatCallStatusLabel } from "@/lib/orbit/canonical-helpers";

// ── Call Repository Ops ──
export {
  acceptCallSession, declineCallSession, hangupCallSession,
  markCallReconnecting, createOutgoingCallSession,
  markCallActive, markCallDeclined, markCallEnded,
  markCallAsMissedV2, markCallMissedByCallId,
  broadcastCallSignal,
} from "@/repositories/communication.repository";

// ── Audio Route ──
export { useAudioRouteStore, CallAudioRoute } from "./call-audio-route";
export type { AudioOutputDevice } from "./call-audio-route";

// ── Ringtone ──
export { useRingtoneStore, CallRingtone } from "./call-ringtone";
export type { RingtoneType } from "./call-ringtone";

// ── Call Privacy ──
export { useCallPrivacyStore, CallPrivacy } from "./call-privacy";
export type { IncomingCallVisibility, LockScreenPolicy } from "./call-privacy";

// ── Call Settings ──
export { useCallSettingsStore } from "./call-settings";

// Calls family owns: audio/video call, incoming, active, accept, reject,
// hangup, missed calls, call logs, call sessions, status normalization,
// audio routing, ringtone, privacy, settings.
