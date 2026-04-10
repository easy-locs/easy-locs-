import { useCallback, useRef } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function useHudSendBridge(
  conversationId: string,
  messageSender: { handleSend: (text: string) => Promise<void> },
  messageActions: { editMessage: (id: string, body: string) => Promise<void> },
  onAfterSend?: () => void,
) {
  const messageSenderRef = useRef(messageSender);
  messageSenderRef.current = messageSender;
  const messageActionsRef = useRef(messageActions);
  messageActionsRef.current = messageActions;
  const onAfterSendRef = useRef(onAfterSend);
  onAfterSendRef.current = onAfterSend;
  const { t } = useI18n();

  const stableHandleSend = useCallback(async () => {
    const store = useOrbitComposerStore.getState();
    if (store.sending[conversationId]) return;

    const draft = store.getDraft(conversationId);

    const activeEdit = store.edits[conversationId];
    if (activeEdit) {
      store.setSending(conversationId, true);
      try {
        await messageActionsRef.current.editMessage(activeEdit.messageId, draft.trim());
        store.clearAfterSend(conversationId);
      } catch (err: any) {
        console.error("[SendBridge] Edit failed:", err?.message);
        toast.error(t("orbit.edit_message_failed"));
      } finally {
        store.setSending(conversationId, false);
      }
      return;
    }

    if (!draft.trim()) return;

    store.setSending(conversationId, true);
    store.clearDraft(conversationId);
    store.clearReply(conversationId);

    try {
      await messageSenderRef.current.handleSend(draft);
      onAfterSendRef.current?.();
    } catch (err: any) {
      console.error("[SendBridge] Send failed:", err?.message);
      toast.error("Message not sent — tap to retry");
      store.setDraft(conversationId, draft);
    } finally {
      useOrbitComposerStore.getState().setSending(conversationId, false);
    }
  }, [conversationId]);

  return { stableHandleSend };
}
