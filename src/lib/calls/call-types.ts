/**
 * Orbit Call Types — shared across call service layer.
 */

export type CallType = "audio" | "video";

export type CallSessionStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "missed"
  | "ended"
  | "failed";

export type SignalType =
  | "offer"
  | "answer"
  | "ice"
  | "hangup"
  | "reject"
  | "accept";

export interface CallSessionRecord {
  id: string;
  room_id: string;
  call_type: CallType;
  caller_user_id: string;
  callee_user_id: string;
  status: CallSessionStatus;
  e2ee_key_hint?: string | null;
  started_at?: string | null;
  answered_at?: string | null;
  ended_at?: string | null;
  timeout_at: string;
  metadata_json?: Record<string, unknown>;
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
