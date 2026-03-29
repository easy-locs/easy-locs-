import { useCallback } from "react";
import { toast } from "sonner";

type ThreadLike = {
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  tenantId?: string | null;
  /** Canonical conversation UUID */
  conversationId?: string | null;
  conversationType?: string | null;
  /** Business entity ID */
  entityId?: string | null;
  name?: string | null;
  // ── Deprecated compat ──
  /** @deprecated Use conversationId */
  v2ConversationId?: string | null;
  /** @deprecated Use conversationId */
  threadId?: string | null;
  /** @deprecated Use entityId */
  contextId?: string | null;
};

type StartCallFn = (opts: {
  targetId: string;
  conversationId?: string;
  entityType?: string;
  entityId?: string;
  contextLabel?: string;
  peerName: string;
  isVideo?: boolean;
  /** @deprecated Use conversationId */
  threadId?: string;
}) => Promise<void>;

export function useCallActions(thread: ThreadLike | null, startCall: StartCallFn) {
  const handleStartCall = useCallback(
    (isVideo: boolean) => {
      const targetId = thread?.peerUserId || thread?.tenantId;
      if (!targetId) {
        toast.error("Unable to resolve call target.");
        return;
      }

      const conversationId = thread?.conversationId || undefined;
      const entityId = thread?.entityId || undefined;

      void startCall({
        targetId,
        conversationId,
        threadId: conversationId, // deprecated compat for startCall signature
        entityType: thread?.conversationType || "direct",
        entityId,
        contextLabel: thread?.name || "Conversation",
        peerName: thread?.name || "Contact",
        isVideo,
      });
    },
    [thread, startCall]
  );

  return { handleStartCall };
}
