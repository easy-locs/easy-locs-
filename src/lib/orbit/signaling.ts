/**
 * Orbit WebRTC signaling via Supabase Realtime — with self-filter + dedupe.
 */
import { supabase } from "@/integrations/supabase/client";

const handledSignalIds = new Set<string>();

export async function sendSignal(params: {
  callSessionId: string;
  senderId?: string;
  workspaceId?: string;
  type: "offer" | "answer" | "ice";
  payload: any;
}) {
  await supabase.from("rtc_signaling_messages" as any).insert({
    call_session_id: params.callSessionId,
    sender_id: params.senderId ?? null,
    workspace_id: params.workspaceId ?? null,
    message_type: params.type,
    payload: params.payload,
  } as any);
}

export function subscribeToSignals(params: {
  callSessionId: string;
  selfUserId?: string;
  onMessage: (msg: any) => void;
}) {
  return supabase
    .channel(`rtc:${params.callSessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "rtc_signaling_messages",
        filter: `call_session_id=eq.${params.callSessionId}`,
      },
      (payload) => {
        const msg = payload.new as any;
        if (!msg?.id) return;
        if (handledSignalIds.has(msg.id)) return;
        handledSignalIds.add(msg.id);
        if (params.selfUserId && msg.sender_id === params.selfUserId) return;
        params.onMessage(msg);
      }
    )
    .subscribe();
}
