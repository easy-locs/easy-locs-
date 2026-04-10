/**
 * Guest Call — Types.
 */
export type CallRole = "caller" | "callee";

export type CallStatus =
  | "idle"
  | "requesting"
  | "ringing"
  | "connecting"
  | "active"
  | "ended"
  | "declined"
  | "failed"
  | "network_blocked";

export type CallFailureReason =
  | "permission_denied"
  | "network_blocked"
  | "ice_timeout"
  | "connection_failed"
  | "unknown";

export interface GuestCallState {
  status: CallStatus;
  callId: string | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
  failureReason?: CallFailureReason;
  usingRelay?: boolean;
}
