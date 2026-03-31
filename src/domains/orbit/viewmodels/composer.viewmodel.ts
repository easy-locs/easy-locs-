/**
 * Composer ViewModel Bridge — Projects composer state into stable props for ComposerShell.
 *
 * OWNER: NO — read-only projection.
 * SOURCE: composerStore (canonical draft/reply/edit owner)
 * OUTPUT: stable props for ComposerShell rendering.
 */
import { useMemo } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";

export interface ComposerViewModel {
  draftText: string;
  hasReply: boolean;
  replyToMessageId: string | null;
  replyPreview: string | null;
  hasEdit: boolean;
  editMessageId: string | null;
  editContent: string | null;
  isSending: boolean;
}

/**
 * useComposerViewModel — Read-only projection of composer state for a given conversation.
 */
export function useComposerViewModel(conversationId: string | null): ComposerViewModel {
  const drafts = useOrbitComposerStore((s) => s.drafts);
  const replies = useOrbitComposerStore((s) => s.replies);
  const edits = useOrbitComposerStore((s) => s.edits);
  const sending = useOrbitComposerStore((s) => s.sending);

  return useMemo((): ComposerViewModel => {
    const key = conversationId || "";
    const draft = drafts[key] ?? "";
    const reply = replies[key] ?? null;
    const edit = edits[key] ?? null;

    return {
      draftText: draft,
      hasReply: !!reply,
      replyToMessageId: reply?.msgId ?? null,
      replyPreview: reply?.preview ?? null,
      hasEdit: !!edit,
      editMessageId: edit?.msgId ?? null,
      editContent: edit?.content ?? null,
      isSending: !!sendingLock[key],
    };
  }, [conversationId, drafts, replies, edits, sendingLock]);
}
