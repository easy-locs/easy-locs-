/**
 * useCallLifecycle — Accept, decline, missed, close call handlers.
 * Single responsibility: call lifecycle state transitions.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { CallManager } from "@/lib/call-manager";
import { declineIncomingCall, markCallMissed } from "@/lib/call/call-incoming-handler";
import { logCallEventToThread } from "@/lib/call-thread-logger";
import type { ActiveCallMeta } from "./useCallState";

export function useCallLifecycle(
  userId: string | undefined,
  activeCallRef: React.MutableRefObject<ActiveCallMeta | null>,
  callManager: CallManager | null,
  callStatus: string | undefined,
  onReset: () => void,
) {
  const handleAcceptIncoming = useCallback(async (
    incomingCallId: string,
    incomingCallerName: string,
    incomingContextLabel: string,
    incomingIsVideo: boolean,
    incomingOrgId: string,
    incomingThreadId: string | null,
    onAccepted: (manager: CallManager, peerName: string, contextLabel: string) => void,
  ) => {
    if (!userId || !incomingCallId) return;

    activeCallRef.current = {
      callId: incomingCallId,
      threadId: incomingThreadId || undefined,
      orgId: incomingOrgId,
    };

    const manager = new CallManager({
      callId: incomingCallId, userId, role: "callee",
      onStateChange: () => {},
    });

    onAccepted(manager, incomingCallerName, incomingContextLabel);
    await manager.acceptCall(incomingIsVideo);
  }, [userId]);

  const handleDeclineIncoming = useCallback(async (
    incomingCallId: string | null,
    incomingThreadId: string | null,
    incomingOrgId: string,
  ) => {
    if (!incomingCallId || !userId) return;
    await declineIncomingCall(incomingCallId, userId);
    if (incomingThreadId) {
      logCallEventToThread({
        callId: incomingCallId, threadId: incomingThreadId,
        orgId: incomingOrgId, senderId: userId, event: "declined",
      });
    }
  }, [userId]);

  const handleMissedIncoming = useCallback(async (
    incomingCallId: string | null,
    incomingThreadId: string | null,
    incomingOrgId: string,
  ) => {
    if (!incomingCallId || !userId) return;
    await markCallMissed(incomingCallId, userId);
    if (incomingThreadId) {
      logCallEventToThread({
        callId: incomingCallId, threadId: incomingThreadId,
        orgId: incomingOrgId, senderId: userId, event: "missed",
      });
    }
  }, [userId]);

  const handleCloseCall = useCallback(async () => {
    const meta = activeCallRef.current;
    if (meta?.threadId && userId) {
      const { data: log } = await supabase
        .from("call_logs")
        .select("status, duration_sec")
        .eq("id", meta.callId)
        .single();
      if ((log as any)?.status === "ended") {
        logCallEventToThread({
          callId: meta.callId, threadId: meta.threadId, orgId: meta.orgId,
          senderId: userId, event: "ended",
          durationSeconds: (log as any)?.duration_sec || 0,
          contextId: meta.contextId,
        });
      }
    }
    callManager?.cleanup("provider-close");
    platformBus.emit("call:ended", { status: callStatus || "ended" }, "orbit");
    onReset();
  }, [callManager, callStatus, userId, onReset]);

  return { handleAcceptIncoming, handleDeclineIncoming, handleMissedIncoming, handleCloseCall };
}
