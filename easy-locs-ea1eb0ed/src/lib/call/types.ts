/**
 * Call types — shared across all call modules.
 */
export type CallStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "active"
  | "ended"
  | "declined"
  | "missed"
  | "failed"
  | "network_blocked";

export type CallRole = "caller" | "callee";

export interface CallState {
  status: CallStatus;
  callId: string | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  usingRelay: boolean;
  error: string | null;
  elapsed: number;
  callerName?: string;
  contextLabel?: string;
}

export type SignalPayload = {
  type: "offer" | "answer" | "ice" | "declined" | "ended" | "accepted";
  data: string;
  from: string;
};
