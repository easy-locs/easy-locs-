/**
 * Orbit Call Types — shared across call service layer.
 */

export type CallType = "audio" | "video";

export type CallSessionStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "ended"
  | "missed";

export type SignalType =
  | "offer"
  | "answer"
  | "ice"
  | "accept"
  | "reject"
  | "hangup";

export interface CallSessionRecord {
  id: string;
  caller_user_id: string;
  callee_user_id: string;
  call_type: CallType;
  status: CallSessionStatus;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallSignalRecord {
  id: string;
  session_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  signal_type: SignalType;
  payload: Record<string, unknown>;
  consumed: boolean;
  created_at: string;
}
