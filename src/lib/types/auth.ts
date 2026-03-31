/**
 * @deprecated — Use CanonicalOrbitProfile from @/domains/shared/canonical-types
 * This file is kept ONLY for backward compatibility.
 */
export type { AppRole } from "@/domains/shared/canonical-types";

/** @deprecated Use CanonicalOrbitProfile */
export type OrbitRole = "owner" | "tenant" | "buyer" | "seller" | "admin";

/** @deprecated Use CanonicalOrbitProfile from @/domains/shared/canonical-types */
export interface OrbitProfile {
  id: string;
  orbit_id: string;
  role: OrbitRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotificationRecordV2 {
  id: string;
  user_id: string;
  orbit_id: string;
  type: "booking" | "payment" | "rent" | "message" | "system" | "call";
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface CallSessionV2 {
  id: string;
  caller_user_id: string;
  caller_orbit_id: string;
  callee_orbit_id: string;
  mode: "audio" | "video";
  status: "ringing" | "connecting" | "active" | "ended" | "missed" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface CallSignalV2 {
  id: number;
  session_id: string;
  sender_user_id: string;
  sender_orbit_id: string;
  target_orbit_id: string;
  signal_type: "offer" | "answer" | "ice" | "hangup";
  payload: Record<string, unknown>;
  created_at: string;
}
