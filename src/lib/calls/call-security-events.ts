/**
 * Call Security Events — Audit logging for call security incidents.
 */
import { supabase } from "@/integrations/supabase/client";

export type CallSecurityEventType =
  | "signal_auth_failed"
  | "signal_replay_blocked"
  | "signal_expired"
  | "signal_user_mismatch"
  | "signal_room_mismatch"
  | "token_invalid"
  | "token_reused"
  | "token_expired"
  | "device_untrusted"
  | "room_reuse_blocked"
  | "rate_limit_exceeded"
  | "media_key_rotated"
  | "suspicious_ice"
  | "call_failed_security";

export type CallSecuritySeverity = "info" | "warn" | "critical";

export async function logCallSecurityEvent(params: {
  roomId?: string;
  userId?: string;
  eventType: CallSecurityEventType;
  severity: CallSecuritySeverity;
  detail?: string;
}) {
  try {
    await supabase.from("call_security_events").insert({
      room_id: params.roomId ?? null,
      user_id: params.userId ?? null,
      event_type: params.eventType,
      severity: params.severity,
      detail_minimal: params.detail ?? null,
    });
  } catch (e) {
    // Never let audit logging block call flow
    console.warn("[call-vault] security_event_log_failed", e);
  }

  console.log(`[call-vault] security_event:${params.eventType}`, {
    severity: params.severity,
    room: params.roomId?.slice(0, 8),
    detail: params.detail,
  });
}
