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
    const targetId = thread?.peerUserId || thread?.tenantId || workspaceId;
    if (!targetId) {
      toast.error("Unable to resolve call target");
      return;
    }

    haptic("medium");
    void startCall({
      orgId: targetId,
      threadId: thread?.v2ConversationId || thread?.threadId,
      contextType: thread?.conversationType || "direct",
      contextId: thread?.v2ConversationId || thread?.contextId,
      contextLabel: thread?.name,
      peerName: thread?.name || "Contact",
      isVideo,
    });
  }, [workspaceId, thread, startCall]);

  return { handleStartCall, isInCall, isStartingCall };
}
