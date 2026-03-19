/**
 * Call Signaling — WebRTC signal message types and builder.
 */

export type CallSignalType =
  | "offer"
  | "answer"
  | "ice_candidate"
  | "hangup"
  | "reject";

export type CallState =
  | "idle"
  | "requesting_media"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "failed";

export interface CallSignalMessage {
  callId: string;
  fromUserId: string;
  toUserId: string;
  type: CallSignalType;
  payload: unknown;
  createdAt: string;
}

export function buildCallSignal(
  callId: string,
  fromUserId: string,
  toUserId: string,
  type: CallSignalType,
  payload: unknown
): CallSignalMessage {
  return {
    callId,
    fromUserId,
    toUserId,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
}
