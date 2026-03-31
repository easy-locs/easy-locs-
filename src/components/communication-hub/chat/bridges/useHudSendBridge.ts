/**
 * useHudSendBridge — Single write-path for message send/edit from HudChatPanel.
 * Owns: anti-double-tap, edit-mode branch, draft clear, lock lifecycle.
 */
import { useCallback } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";

export function useHudSendBridge(
  conversationId: string,
  messageSender: { handleSend: (text: string) => Promise<void> },
  messageActions: { editMessage: (id: string, body: string) => Promise<void> },
) {
  const composerStore = useOrbitComposerStore();

  const stableHandleSend = useCallback(async () => {
    if (composerStore.sending[conversationId]) return;

    const draft = composerStore.getDraft(conversationId);

    // ── EDIT MODE ──
    const activeEdit = composerStore.edits[conversationId];
    if (activeEdit) {
      composerStore.setSending(conversationId, true);
      try {
        await messageActions.editMessage(activeEdit.messageId, draft.trim());
        composerStore.clearAfterSend(conversationId);
      } finally {
        composerStore.setSending(conversationId, false);
      }
      return;
    }

    if (!draft.trim()) return;

    composerStore.setSending(conversationId, true);
    composerStore.clearDraft(conversationId);
    composerStore.clearReply(conversationId);

    try {
      await messageSender.handleSend(draft);
    } finally {
      composerStore.setSending(conversationId, false);
    }
  }, [messageActions, messageSender, composerStore, conversationId]);

  return { stableHandleSend };
}
