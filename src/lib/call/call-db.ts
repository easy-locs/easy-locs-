/**
 * Call DB operations — isolated database writes for call lifecycle.
 */
import { supabase } from "@/integrations/supabase/client";

export async function markCallActive(callId: string) {
  const now = new Date().toISOString();
  return supabase.from("call_logs")
    .update({ status: "active", started_at: now, answered_at: now } as any)
    .eq("id", callId)
    .select("id,status,started_at")
    .maybeSingle();
}

export async function markCallDeclined(callId: string) {
  return supabase.from("call_logs")
    .update({ status: "declined", ended_at: new Date().toISOString() } as any)
    .eq("id", callId)
    .neq("status", "declined")
    .select("id,status,ended_at")
    .maybeSingle();
}

export async function markCallEnded(callId: string, durationSec: number) {
  return supabase.from("call_logs")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      duration_sec: durationSec,
    } as any)
    .eq("id", callId)
    .neq("status", "ended")
    .select("id,status,ended_at,duration_sec")
    .maybeSingle();
}
