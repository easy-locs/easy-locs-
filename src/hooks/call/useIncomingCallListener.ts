/**
 * useIncomingCallListener — Realtime subscription for incoming calls.
 * Single responsibility: listen to call_logs inserts/updates and update incoming state.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { processIncomingInsert, processIncomingUpdate } from "@/lib/call/call-incoming-handler";
import { registerChannel, unregisterChannel, recordEvent } from "@/lib/runtime/realtime-monitor";
import { debugLog } from "@/lib/debug/runtime-debug-bus";

export function useIncomingCallListener(
  userId: string | undefined,
  myOrbitId: string | null,
  incomingCallIdRef: React.MutableRefObject<string | null>,
  onIncoming: (info: {
    callId: string; callerName: string; contextLabel: string;
    isVideo: boolean; orgId: string; threadId: string | null;
  }) => void,
  onDismissed: () => void,
) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const receiverIds = [userId, ...(myOrbitId && myOrbitId !== userId ? [myOrbitId] : [])];
    const channelName = `incoming-calls-${userId}-${Date.now()}`;
    registerChannel(channelName, "calls");

    const handleInsert = async (payload: any) => {
      recordEvent(channelName);
      const info = await processIncomingInsert(payload.new, userId, myOrbitId);
      if (!info) return;
      debugLog.success("call", "call.signal.received", `INSERT ${info.callId}`, payload.new);
      onIncoming(info);
    };

    const handleUpdate = (payload: any) => {
      recordEvent(channelName);
      debugLog.info("call", "call.signal.updated", `UPDATE ${payload.new?.id || "unknown"}`, payload.new);
      if (processIncomingUpdate(payload.new, incomingCallIdRef.current)) {
        onDismissed();
      }
    };

    let channel = supabase.channel(channelName);
    for (const rid of receiverIds) {
      channel = channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_logs", filter: `receiver_orbit_id=eq.${rid}` }, handleInsert)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_logs", filter: `receiver_orbit_id=eq.${rid}` }, handleUpdate);
    }

    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        debugLog.success("realtime", "call.subscription.subscribed", "CallProvider reached SUBSCRIBED", { userId });
      } else if (status === "CHANNEL_ERROR") {
        debugLog.error("realtime", "call.subscription.error", err?.message || "CHANNEL_ERROR", { userId });
      } else if (status === "TIMED_OUT") {
        debugLog.warn("realtime", "call.subscription.timeout", "Subscription timed out", { userId });
      }
    });

    channelRef.current = channel;
    return () => {
      unregisterChannel(channelName);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, myOrbitId]);
}
