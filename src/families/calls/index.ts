/**
 * FAMILY: CALLS — Canonical call state, actions, history, lifecycle.
 * Single source of truth for all call-related logic.
 * All DB ops go through communication.repository (zero inline supabase).
 */
export { useOrbitCallState } from "@/hooks/useOrbitCallState";
export { useOrbitCallActions } from "@/hooks/useOrbitCallActions";
export { useOrbitCallHistory } from "@/hooks/useOrbitCallHistory";
export { useOrbitDevicePermissions } from "@/hooks/useOrbitDevicePermissions";
export { useThreadCallFamily } from "@/hooks/orbit/families/useThreadCallFamily";
export { formatCallStatusLabel } from "@/lib/orbit/canonical-helpers";
export {
  acceptCallSession, declineCallSession, hangupCallSession,
  markCallReconnecting, createOutgoingCallSession,
  markCallActive, markCallDeclined, markCallEnded,
  markCallAsMissedV2, markCallMissedByCallId,
  broadcastCallSignal,
} from "@/repositories/communication.repository";

// Calls family owns: audio/video call, incoming, active, accept, reject,
// hangup, missed calls, call logs, call sessions, status normalization
