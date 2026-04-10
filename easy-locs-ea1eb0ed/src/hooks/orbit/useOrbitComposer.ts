/**
 * useOrbitComposer — Facade hook for the composer store.
 * Single interface for all composer operations, scoped to conversationId.
 * Uses targeted selectors — never subscribes to the full store.
 */
import { useCallback, useMemo } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import type { ComposerMode } from "@/lib/orbit/composer-types";

export function useOrbitComposer(conversationId: string | null) {
  const cid = conversationId ?? "";

  const draft = useOrbitComposerStore(s => s.drafts[cid] ?? "");
  const replyState = useOrbitComposerStore(s => s.replies[cid] ?? null);
  const editState = useOrbitComposerStore(s => s.edits[cid] ?? null);
  const voiceDraft = useOrbitComposerStore(s => s.voiceDrafts[cid] ?? null);
  const isSending = useOrbitComposerStore(s => s.sending[cid] ?? false);

  const setDraft = useCallback(
    (value: string) => useOrbitComposerStore.getState().setDraft(cid, value),
    [cid],
  );

  const clearDraft = useCallback(
    () => useOrbitComposerStore.getState().clearDraft(cid),
    [cid],
  );

  const setReply = useCallback(
    (reply: { msgId: string; content: string; senderName?: string } | null) =>
      useOrbitComposerStore.getState().setReply(cid, reply),
    [cid],
  );

  const clearReply = useCallback(
    () => useOrbitComposerStore.getState().clearReply(cid),
    [cid],
  );

  const startEdit = useCallback(
    (edit: { messageId: string; originalBody: string }) =>
      useOrbitComposerStore.getState().startEdit(cid, edit),
    [cid],
  );

  const cancelEdit = useCallback(
    () => useOrbitComposerStore.getState().cancelEdit(cid),
    [cid],
  );

  const setVoiceDraft = useCallback(
    (d: { url: string; blob: Blob; durationSeconds: number } | null) =>
      useOrbitComposerStore.getState().setVoiceDraft(cid, d),
    [cid],
  );

  const clearVoiceDraft = useCallback(
    () => useOrbitComposerStore.getState().clearVoiceDraft(cid),
    [cid],
  );

  const setSending = useCallback(
    (v: boolean) => useOrbitComposerStore.getState().setSending(cid, v),
    [cid],
  );

  const clearAfterSend = useCallback(
    () => useOrbitComposerStore.getState().clearAfterSend(cid),
    [cid],
  );

  const mode: ComposerMode = useMemo(() => {
    if (isSending) return "sending" as ComposerMode;
    if (editState) return "editing" as ComposerMode;
    if (voiceDraft) return "voice" as ComposerMode;
    if (replyState) return "replying" as ComposerMode;
    if (draft.trim()) return "typing" as ComposerMode;
    return "idle" as ComposerMode;
  }, [isSending, editState, voiceDraft, replyState, draft]);

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
