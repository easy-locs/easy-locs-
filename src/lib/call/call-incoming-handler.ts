/**
 * call-incoming-handler — Atomic unit: handle incoming call realtime events.
 * Single responsibility: process INSERT/UPDATE on call_logs for incoming calls.
 * All DB ops go through canonical repository.
 */
import { supabase } from "@/integrations/supabase/client";
import { markCallDeclined, markCallMissedByCallId, broadcastCallSignal } from "@/repositories/communication.repository";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[CALL][${step}] ${phase}:`, payload ?? {});
};

export interface IncomingCallInfo {
  callId: string;
  callerName: string;
  contextLabel: string;
  isVideo: boolean;
  orgId: string;
  threadId: string | null;
}

export async function processIncomingInsert(
  callRow: any,
  currentUserId: string,
  myOrbitId: string | null
): Promise<IncomingCallInfo | null> {
  trace("incoming.insert", "input", {
    callId: callRow?.id, status: callRow?.status,
    receiver: callRow?.receiver_orbit_id,
    caller: callRow?.caller_orbit_id,
  });

  if (!callRow || callRow.status !== "ringing") return null;

  const callerField = callRow.caller_orbit_id;
  if (callerField === currentUserId || callerField === myOrbitId) return null;

  let callerName = "User";
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", callerField)
    .maybeSingle();

  if (profile?.name || profile?.email) {
    callerName = profile.name || profile.email || "User";
  } else {
    const { data: orbitProfile } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("display_name, email")
      .or(`id.eq.${callerField},orbit_id.eq.${callerField}`)
      .maybeSingle();
    if (orbitProfile?.display_name || orbitProfile?.email) {
      callerName = orbitProfile.display_name || orbitProfile.email;
    }
  }

  const info: IncomingCallInfo = {
    callId: callRow.id,
    callerName,
    contextLabel: "",
    isVideo: callRow.call_type === "video",
    orgId: callRow.receiver_orbit_id || "",
    threadId: callRow.conversation_id || null,
  };

  trace("incoming.insert", "output", { callId: info.callId, callerName: info.callerName });
  return info;
}

export function processIncomingUpdate(
  callRow: any,
  currentIncomingCallId: string | null
): boolean {
  if (!callRow) return false;
  if (callRow.status !== "ringing" && callRow.id === currentIncomingCallId) {
    trace("incoming.update", "output", { callId: callRow.id, dismiss: true });
    return true;
  }
  return false;
}

export async function declineIncomingCall(callId: string, userId: string): Promise<void> {
  trace("incoming.decline", "input", { callId, userId });
  await markCallDeclined(callId);
  await broadcastCallSignal(callId, "declined", userId);
  trace("incoming.decline", "output", { callId });
}

export async function markCallMissed(callId: string, userId: string): Promise<void> {
  trace("incoming.missed", "input", { callId, userId });
  await markCallMissedByCallId(callId);
  await broadcastCallSignal(callId, "declined", userId);
  trace("incoming.missed", "output", { callId });
}
