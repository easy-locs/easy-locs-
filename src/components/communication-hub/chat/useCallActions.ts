/**
 * useCallActions — Encapsulates call initiation logic.
 * Extracted from HudChatPanel monolith.
 */
import { useCallback } from "react";
import { useCall } from "@/components/call/CallProvider";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import type { ConversationThread } from "../types";

export function useCallActions(thread: ConversationThread | null, orgId: string | null) {
  const { startCall, isInCall, isStartingCall } = useCall();

  const handleStartCall = useCallback((isVideo: boolean) => {
    if (!orgId) {
      toast.error("Please select a workspace first");
      return;
    }
    haptic("medium");
    startCall({
      orgId,
      threadId: thread?.threadId,
      contextType: thread?.conversationType || "listing",
      contextId: thread?.contextId,
      contextLabel: thread?.name,
      peerName: thread?.name || "Contact",
      isVideo,
    });
  }, [orgId, thread, startCall]);

  return { handleStartCall, isInCall, isStartingCall };
}
