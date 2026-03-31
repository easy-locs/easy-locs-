/**
 * normalizeCallSession — Transform raw call log/session into OrbitCallSession.
 */
import type { OrbitCallSession, CallSessionStatus, CallMode } from "../types";

const VALID_STATUSES: CallSessionStatus[] = [
  "initiated", "ringing", "accepted", "active",
  "reconnecting", "ended", "missed", "failed", "declined",
];

export function normalizeCallSession(raw: any): OrbitCallSession {
  if (!raw) return emptyCallSession();

  return {
    id: raw.id || "",
    conversationId: raw.conversation_id || raw.conversationId || null,
    initiatorId: raw.caller_orbit_id || raw.caller_id || raw.initiatorId || "",
    participantIds: resolveParticipants(raw),
    mode: (raw.is_video || raw.mode === "video") ? "video" : "audio",
    status: resolveCallStatus(raw.status),
    startedAt: raw.started_at || raw.startedAt || raw.created_at || null,
    answeredAt: raw.answered_at || raw.answeredAt || null,
    endedAt: raw.ended_at || raw.endedAt || null,
    durationSeconds: raw.duration_seconds || raw.durationSeconds || null,
  };
}

export function normalizeCallSessions(rows: any[]): OrbitCallSession[] {
  return rows.map(normalizeCallSession);
}

function resolveCallStatus(raw: any): CallSessionStatus {
  if (typeof raw === "string" && VALID_STATUSES.includes(raw as CallSessionStatus)) {
    return raw as CallSessionStatus;
  }
  // Legacy mapping
  if (raw === "completed" || raw === "hangup") return "ended";
  if (raw === "no_answer" || raw === "unanswered") return "missed";
  if (raw === "rejected" || raw === "busy") return "declined";
  return "ended";
}

function resolveParticipants(raw: any): string[] {
  if (Array.isArray(raw.participantIds)) return raw.participantIds;
  const ids: string[] = [];
  if (raw.caller_orbit_id || raw.caller_id) ids.push(raw.caller_orbit_id || raw.caller_id);
  if (raw.receiver_orbit_id || raw.receiver_id) ids.push(raw.receiver_orbit_id || raw.receiver_id);
  return ids.filter(Boolean);
}

function emptyCallSession(): OrbitCallSession {
  return {
    id: "",
    conversationId: null,
    initiatorId: "",
    participantIds: [],
    mode: "audio",
    status: "ended",
    startedAt: null,
    answeredAt: null,
    endedAt: null,
    durationSeconds: null,
  };
}
