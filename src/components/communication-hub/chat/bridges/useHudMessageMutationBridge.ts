/**
 * useHudMessageMutationBridge — Single write-path for local message mutations.
 * Owns: delete-for-all, edit reconciliation, star toggle in rawMessages.
 *
 * These mutations update local state optimistically; the DB write is done
 * by the calling action (messageActions / context menu) before this bridge
 * is invoked. This bridge is purely a *local-state projection* layer.
 *
 * Entrée : action callbacks from context menu / toolbar
 * Sortie : stable setters that touch loader.setRawMessages ONCE
 */
import { useCallback, useMemo } from "react";

type ChatMessage = {
  id: string;
  content: string;
  [key: string]: unknown;
};

type SetRawMessages = React.Dispatch<React.SetStateAction<ChatMessage[]>>;
type SetHiddenMsgIds = React.Dispatch<React.SetStateAction<Set<string>>>;

interface MessageMutationBridgeDeps {
  setRawMessages: SetRawMessages;
  setHiddenMsgIds: SetHiddenMsgIds;
}

export function useHudMessageMutationBridge(deps: MessageMutationBridgeDeps) {
  const { setRawMessages, setHiddenMsgIds } = deps;

  /** Mark a message as deleted-for-all (visual tombstone). */
  const applyDeleteForAll = useCallback(
    (msgId: string) => {
      setRawMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                content: "🚫 This message was deleted",
                message_type: "system",
                attachment_url: null,
                audio_url: undefined,
                audio_duration_seconds: undefined,
                deleted_for_all: true,
              } as any
            : m,
        ),
      );
    },
    [setRawMessages],
  );

  /** Mark messages as deleted-for-all in batch (multi-select toolbar). */
  const applyBatchDeleteForAll = useCallback(
    (ids: string[]) => {
      setRawMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id)
            ? {
                ...m,
                content: "🚫 This message was deleted",
                deleted_for_all: true,
                attachment_url: null,
                audio_url: null,
                audio_duration_seconds: null,
              } as any
            : m,
        ),
      );
    },
    [setRawMessages],
  );

  /** Hide a message locally (delete-for-me). */
  const applyDeleteForMe = useCallback(
    (msgId: string) => {
      setHiddenMsgIds((prev) => new Set([...prev, msgId]));
    },
    [setHiddenMsgIds],
  );

  /** Batch hide (multi-select). */
  const applyBatchDeleteForMe = useCallback(
    (ids: string[]) => {
      setHiddenMsgIds((prev) => new Set([...prev, ...ids]));
    },
    [setHiddenMsgIds],
  );

  /** Apply an edit to local message content. */
  const applyEdit = useCallback(
    (msgId: string, newContent: string) => {
      setRawMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, content: newContent, edited_at: new Date().toISOString() } as any
            : m,
        ),
      );
    },
    [setRawMessages],
  );

  /** Toggle star state on a message. */
  const applyStar = useCallback(
    (msgId: string, starred: boolean) => {
      setRawMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, starred } as any : m,
        ),
      );
    },
    [setRawMessages],
  );

  /** Handle context menu onDeleted callback. */
  const handleContextMenuDeleted = useCallback(
    (msgId: string, type: string) => {
      if (type === "self") applyDeleteForMe(msgId);
      else applyDeleteForAll(msgId);
    },
    [applyDeleteForMe, applyDeleteForAll],
  );

  return useMemo(
    () => ({
      applyDeleteForAll,
      applyBatchDeleteForAll,
      applyDeleteForMe,
      applyBatchDeleteForMe,
      applyEdit,
      applyStar,
      handleContextMenuDeleted,
    }),
    [
      applyDeleteForAll,
      applyBatchDeleteForAll,
      applyDeleteForMe,
      applyBatchDeleteForMe,
      applyEdit,
      applyStar,
      handleContextMenuDeleted,
    ],
  );
}
