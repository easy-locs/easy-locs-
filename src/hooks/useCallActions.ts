import { useCallback } from "react";
import { toast } from "sonner";

type ThreadLike = {
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  tenantId?: string | null;
  v2ConversationId?: string | null;
  threadId?: string | null;
  conversationType?: string | null;
  contextId?: string | null;
  name?: string | null;
};

type StartCallFn = (opts: {
  targetId: string;
  threadId?: string;
  contextType?: string;
  contextId?: string;
  contextLabel?: string;
  peerName: string;
  isVideo?: boolean;
}) => Promise<void>;

export function useCallActions(thread: ThreadLike | null, startCall: StartCallFn) {
  const handleStartCall = useCallback(
    (isVideo: boolean) => {
      const targetId = thread?.peerUserId || thread?.tenantId;
      if (!targetId) {
        toast.error("Unable to resolve call target.");
        return;
      }

      void startCall({
        targetId,
        threadId: thread?.v2ConversationId || thread?.threadId || undefined,
        contextType: thread?.conversationType || "direct",
        contextId: thread?.v2ConversationId || thread?.contextId || undefined,
        contextLabel: thread?.name || "Conversation",
        peerName: thread?.name || "Contact",
        isVideo,
      });
    },
    [thread, startCall]
  );

  return { handleStartCall };
}
