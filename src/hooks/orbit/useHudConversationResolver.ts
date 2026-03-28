/**
 * useHudConversationResolver — Atomic hook: resolve auth user and conversation IDs.
 * Single responsibility: identity + conversation resolution for HudChatPanel.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseHudConversationResolverParams {
  thread: any;
  myOrbitId: string | null;
  onThreadUpdate: (threadId: string, updates: any) => void;
  t: (k: string) => string;
}

export function useHudConversationResolver({
  thread, myOrbitId, onThreadUpdate, t,
}: UseHudConversationResolverParams) {
  const resolveAuthUserId = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      toast.error(t("orbit.session_expired") || "Session expired");
      return null;
    }
    return data.user.id;
  }, [t]);

  const resolveConversationId = useCallback(async (authUserId: string): Promise<string | null> => {
    if (!thread) return null;
    if (thread.v2ConversationId) return thread.v2ConversationId;
    if (!thread.peerUserId) {
      toast.error("No conversation found. Open a thread first.");
      return null;
    }
    try {
      const { createOrGetDirectConversation } = await import("@/lib/orbit/createOrGetDirectConversation");
      const conv = await createOrGetDirectConversation({
        myUserId: authUserId,
        myOrbitId,
        peerUserId: thread.peerUserId,
        peerOrbitId: thread.peerOrbitId,
      });
      onThreadUpdate(thread.id, { v2ConversationId: conv.id });
      return conv.id;
    } catch (err: any) {
      console.error("[HudConversationResolver] auto-create failed", err);
      toast.error("Failed to create conversation.");
      return null;
    }
  }, [thread, myOrbitId, onThreadUpdate]);

  return { resolveAuthUserId, resolveConversationId };
}
