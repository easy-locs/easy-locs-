/**
 * useMessageSelection — Unified message selection + context menu.
 * Selection state delegates to useOrbitSelectionStore (single source of truth).
 * Context menu, forward, and hidden IDs are local ephemeral UI state.
 * Uses targeted selectors — never subscribes to the full store.
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
  const selectMode = useOrbitSelectionStore(s => s.mode === "selecting");
  const selectedIds = useOrbitSelectionStore(s => s.selectedIds);

  const [contextMessage, setContextMessage] = useState<ContextMenuTarget | null>(null);
  const [forwardData, setForwardData] = useState<{ messageId: string; content: string } | null>(null);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());

  const setSelectMode = useCallback((value: boolean) => {
    if (!value) useOrbitSelectionStore.getState().clearSelection();
  }, []);

  const toggleMsgSelect = useCallback((id: string) => {
    useOrbitSelectionStore.getState().toggleSelection(id);
  }, []);

  const enterSelectMode = useCallback((msgId: string) => {
    useOrbitSelectionStore.getState().enterSelectionMode("", msgId);
  }, []);

  const clearSelection = useCallback(() => {
    useOrbitSelectionStore.getState().clearSelection();
  }, []);

  return {
    selectMode, setSelectMode,
    selectedMsgIds: selectedIds,
    setSelectedMsgIds: () => {},
    contextMessage, setContextMessage,
    forwardData, setForwardData,
    hiddenMsgIds, setHiddenMsgIds,
    toggleMsgSelect,
    enterSelectMode,
    clearSelection,
  };
}
