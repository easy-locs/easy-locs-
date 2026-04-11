/**
 * useHudConversationResolver — Atomic hook: resolve auth user and conversation IDs.
 * Single responsibility: identity + conversation resolution for HudChatPanel.
 */
import { useCallback, useRef } from "react";
import { getCurrentUserId } from "@/families/identity";
import { toast } from "sonner";

interface UseHudConversationResolverParams {
  thread: any;
  myOrbitId: string | null;
  onThreadUpdate: (conversationId: string, updates: any) => void;
  t: (k: string) => string;
}

export function useHudConversationResolver({
  thread, myOrbitId, onThreadUpdate, t,
}: UseHudConversationResolverParams) {
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const onThreadUpdateRef = useRef(onThreadUpdate);
  onThreadUpdateRef.current = onThreadUpdate;

  const resolveAuthUserId = useCallback(async (): Promise<string | null> => {
    try {
      return await getCurrentUserId();
    } catch {
      toast.error(t("orbit.session_expired") || "Session expired");
      return null;
    }
  }, [t]);

  const resolveConversationId = useCallback(async (authUserId: string): Promise<string | null> => {
    const currentThread = threadRef.current;
    if (!currentThread) return null;
    if (currentThread.conversationId) return currentThread.conversationId;
    if (currentThread.v2ConversationId) return currentThread.v2ConversationId;
    if (!currentThread.peerUserId) {
      toast.error("No conversation found. Open a thread first.");
      return null;
    }
    try {
      const { createOrGetDirectConversation } = await import("@/lib/orbit/createOrGetDirectConversation");
      const conv = await createOrGetDirectConversation({
        myUserId: authUserId,
        myOrbitId,
        peerUserId: currentThread.peerUserId,
        peerOrbitId: currentThread.peerOrbitId,
      });
      onThreadUpdateRef.current(currentThread.id, { conversationId: conv.id });
      return conv.id;
    } catch (err: any) {
      console.error("[HudConversationResolver] auto-create failed", err);
      toast.error("Failed to create conversation.");
      return null;
    }
  }, [myOrbitId]);

  return { resolveAuthUserId, resolveConversationId };
}
