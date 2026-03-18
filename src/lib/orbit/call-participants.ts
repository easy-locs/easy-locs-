/**
 * Orbit call participants — join, leave, subscribe.
 */
import { supabase } from "@/integrations/supabase/client";

export async function joinCallParticipant(params: {
  callSessionId: string;
  userId?: string;
  role?: "caller" | "callee" | "observer" | "translator";
}) {
  const { data } = await supabase
    .from("call_participants" as any)
    .insert({
      call_session_id: params.callSessionId,
      user_id: params.userId ?? null,
      role: params.role ?? "participant",
      status: "joined",
    } as any)
    .select("*")
    .single();
  return data;
}

export async function leaveCallParticipant(participantId: string) {
  await supabase
    .from("call_participants" as any)
    .update({ status: "left", left_at: new Date().toISOString() } as any)
    .eq("id", participantId);
}

export function subscribeToCallParticipants(
  callSessionId: string,
  onChange: (row: any) => void
) {
  return supabase
    .channel(`call-participants:${callSessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "call_participants",
        filter: `call_session_id=eq.${callSessionId}`,
      },
      (payload) => onChange(payload.new ?? payload.old)
    )
    .subscribe();
}
