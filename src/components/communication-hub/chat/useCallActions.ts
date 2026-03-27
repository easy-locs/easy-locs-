/**
 * useCallActions — Encapsulates canonical call initiation logic.
 * Always resolves to a single target path: peer user when available, otherwise workspace owner path.
 */
import { useCallback } from "react";
import { useCall } from "@/components/call/CallProvider";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import type { ConversationThread } from "../types";

export function useCallActions(thread: ConversationThread | null, workspaceId: string | null) {
  const { startCall, isInCall, isStartingCall } = useCall();

  const handleStartCall = useCallback((isVideo: boolean) => {
    const isDirect = thread?.conversationType === "direct";
    const targetId = isDirect ? thread?.peerUserId : (thread?.peerUserId || thread?.tenantId);

    console.log("[useCallActions] handleStartCall", {
      threadId: thread?.id,
      v2ConversationId: thread?.v2ConversationId,
      peerUserId: thread?.peerUserId,
      peerOrbitId: thread?.peerOrbitId,
      contextId: thread?.v2ConversationId || thread?.contextId,
      isDirect,
      resolvedTargetId: targetId,
      isVideo,
    });

    if (!targetId) {
      toast.error(isDirect ? "Impossible d'appeler ce contact : peer introuvable" : "Unable to resolve call target — no peer found");
      return;
    }

    haptic("medium");
    void startCall({
      targetId,
      threadId: thread?.v2ConversationId || thread?.threadId,
      contextType: thread?.conversationType || "direct",
      contextId: thread?.v2ConversationId || thread?.contextId,
      contextLabel: thread?.name,
      peerName: thread?.name || "Contact",
      isVideo,
    });
  }, [thread, startCall]);

  return { handleStartCall, isInCall, isStartingCall };
}
