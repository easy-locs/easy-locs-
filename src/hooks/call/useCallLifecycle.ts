/**
 * useCallLifecycle — Accept, decline, missed, close call handlers.
 * Single responsibility: call lifecycle state transitions.
 * PHASE 2: No direct Supabase — uses repository.
 */
import { useCallback } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { CallManager } from "@/lib/call-manager";
import { declineIncomingCall, markCallMissed } from "@/lib/call/call-incoming-handler";
import { logCallEventToThread } from "@/lib/call-thread-logger";
import { fetchCallLogStatus } from "@/repositories/communication.repository";
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
    incomingConversationId: string | null,
    onAccepted: (manager: CallManager, peerName: string, contextLabel: string) => void,
  ) => {
    if (!userId || !incomingCallId) return;

    activeCallRef.current = {
      callId: incomingCallId,
      conversationId: incomingConversationId || undefined,
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
    incomingConversationId: string | null,
    incomingOrgId: string,
  ) => {
    if (!incomingCallId || !userId) return;
    await declineIncomingCall(incomingCallId, userId);
    if (incomingConversationId) {
      logCallEventToThread({
        callId: incomingCallId, conversationId: incomingConversationId,
        orgId: incomingOrgId, senderId: userId, event: "declined",
      });
    }
  }, [userId]);

  const handleMissedIncoming = useCallback(async (
    incomingCallId: string | null,
    incomingConversationId: string | null,
    incomingOrgId: string,
  ) => {
    if (!incomingCallId || !userId) return;
    await markCallMissed(incomingCallId, userId);
    if (incomingConversationId) {
      logCallEventToThread({
        callId: incomingCallId, conversationId: incomingConversationId,
        orgId: incomingOrgId, senderId: userId, event: "missed",
      });
    }
  }, [userId]);

  const handleCloseCall = useCallback(async () => {
    const meta = activeCallRef.current;
    const convId = meta?.conversationId;
    if (convId && userId) {
      const log = await fetchCallLogStatus(meta.callId);
      if ((log as any)?.status === "ended") {
        logCallEventToThread({
          callId: meta.callId, conversationId: convId, orgId: meta.orgId,
          senderId: userId, event: "ended",
          durationSeconds: (log as any)?.duration_sec || 0,
          entityId: meta.entityId,
        });
      }
    }
    callManager?.cleanup("provider-close");
    platformBus.emit("call:ended", { status: callStatus || "ended" }, "orbit");
    onReset();
  }, [callManager, callStatus, userId, onReset]);

  return { handleAcceptIncoming, handleDeclineIncoming, handleMissedIncoming, handleCloseCall };
}
