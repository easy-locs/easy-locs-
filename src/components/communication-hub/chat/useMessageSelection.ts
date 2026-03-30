/**
 * useMessageSelection — Unified message selection + context menu.
 * Selection state delegates to useOrbitSelectionStore (single source of truth).
 * Context menu, forward, and hidden IDs are local ephemeral UI state.
 */
import { useState, useCallback } from "react";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";

export interface ContextMenuTarget {
  msgId: string;
  content: string;
  isMe: boolean;
  createdAt: string;
  hasAudio?: boolean;
  hasAttachment?: boolean;
  senderId?: string;
  canModerate?: boolean;
  isStarred?: boolean;
}

export function useMessageSelection() {
  const store = useOrbitSelectionStore();

  // Ephemeral UI-only state (not persisted in store)
  const [contextMessage, setContextMessage] = useState<ContextMenuTarget | null>(null);
  const [forwardData, setForwardData] = useState<{ messageId: string; content: string } | null>(null);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());

  // Delegate selection to global store
  const selectMode = store.mode === "selecting";

  const setSelectMode = useCallback((value: boolean) => {
    if (!value) store.clearSelection();
  }, [store]);

  const toggleMsgSelect = useCallback((id: string) => {
    store.toggleSelection(id);
  }, [store]);

  const enterSelectMode = useCallback((msgId: string) => {
    store.enterSelectionMode("", msgId);
  }, [store]);

  const clearSelection = useCallback(() => {
    store.clearSelection();
  }, [store]);

  return {
    selectMode, setSelectMode,
    selectedMsgIds: store.selectedIds,
    setSelectedMsgIds: () => {}, // no-op — store owns this
    contextMessage, setContextMessage,
    forwardData, setForwardData,
    hiddenMsgIds, setHiddenMsgIds,
    toggleMsgSelect,
    enterSelectMode,
    clearSelection,
  };
}
