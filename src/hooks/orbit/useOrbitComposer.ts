/**
 * useOrbitComposer — Facade hook for the composer store.
 * Single interface for all composer operations, scoped to conversationId.
 */
import { useCallback, useMemo } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import type { ComposerMode } from "@/lib/orbit/composer-types";

export function useOrbitComposer(conversationId: string | null) {
  const store = useOrbitComposerStore();
  const cid = conversationId ?? "";

  const draft = store.getDraft(cid);
  const replyState = store.replies[cid] ?? null;
  const editState = store.edits[cid] ?? null;
  const voiceDraft = store.voiceDrafts[cid] ?? null;
  const isSending = store.sending[cid] ?? false;

  const setDraft = useCallback(
    (value: string) => store.setDraft(cid, value),
    [store, cid],
  );

  const clearDraft = useCallback(
    () => store.clearDraft(cid),
    [store, cid],
  );

  const setReply = useCallback(
    (reply: { msgId: string; content: string; senderName?: string } | null) =>
      store.setReply(cid, reply),
    [store, cid],
  );

  const clearReply = useCallback(
    () => store.clearReply(cid),
    [store, cid],
  );

  const startEdit = useCallback(
    (edit: { messageId: string; originalBody: string }) =>
      store.startEdit(cid, edit),
    [store, cid],
  );

  const cancelEdit = useCallback(
    () => store.cancelEdit(cid),
    [store, cid],
  );

  const setVoiceDraft = useCallback(
    (d: { url: string; blob: Blob; durationSeconds: number } | null) =>
      store.setVoiceDraft(cid, d),
    [store, cid],
  );

  const clearVoiceDraft = useCallback(
    () => store.clearVoiceDraft(cid),
    [store, cid],
  );

  const setSending = useCallback(
    (v: boolean) => store.setSending(cid, v),
    [store, cid],
  );

  const clearAfterSend = useCallback(
    () => store.clearAfterSend(cid),
    [store, cid],
  );

  const mode: ComposerMode = useMemo(() => {
    return store.getMode(cid) as ComposerMode;
  }, [store, cid]);

  const canSend = useMemo(() => {
    if (isSending) return false;
    if (editState) return draft.trim().length > 0;
    if (voiceDraft) return true;
    return draft.trim().length > 0;
  }, [isSending, editState, voiceDraft, draft]);

  return {
    draft,
    setDraft,
    clearDraft,
    replyState,
    setReply,
    clearReply,
    editState,
    startEdit,
    cancelEdit,
    voiceDraft,
    setVoiceDraft,
    clearVoiceDraft,
    isSending,
    setSending,
    clearAfterSend,
    mode,
    canSend,
  };
}
