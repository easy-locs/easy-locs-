/**
 * useOrbitSelection — Facade hook for selection store.
 * Scoped to a single conversationId.
 * Uses targeted selectors — never subscribes to the full store.
 */
import { useCallback, useMemo } from "react";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";
import type { SelectionCapabilities } from "@/lib/orbit/selection-types";

export function useOrbitSelection(conversationId: string | null) {
  const storeConversationId = useOrbitSelectionStore(s => s.conversationId);
  const storeMode = useOrbitSelectionStore(s => s.mode);
  const storeSelectedIds = useOrbitSelectionStore(s => s.selectedIds);

  const isActiveConversation = storeConversationId === conversationId;
  const selectionMode = isActiveConversation ? storeMode : "idle" as const;
  const selectedIds = useMemo(
    () => isActiveConversation ? Array.from(storeSelectedIds) : [],
    [isActiveConversation, storeSelectedIds],
  );
  const selectedCount = isActiveConversation ? storeSelectedIds.size : 0;

  const isSelected = useCallback(
    (messageId: string) => isActiveConversation && useOrbitSelectionStore.getState().isSelected(messageId),
    [isActiveConversation],
  );

  const enterSelectionMode = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      useOrbitSelectionStore.getState().enterSelectionMode(conversationId, messageId);
    },
    [conversationId],
  );

  const toggleSelection = useCallback(
    (messageId: string) => useOrbitSelectionStore.getState().toggleSelection(messageId),
    [],
  );

  const clearSelection = useCallback(
    () => useOrbitSelectionStore.getState().clearSelection(),
    [],
  );

  const capabilities: SelectionCapabilities = useMemo(() => ({
    canDelete: selectedCount > 0,
    canForward: selectedCount > 0,
    canCopy: selectedCount > 0,
    canStar: selectedCount > 0,
  }), [selectedCount]);

  return {
    selectionMode,
    selectedIds,
    selectedCount,
    isSelected,
    enterSelectionMode,
    toggleSelection,
    clearSelection,
    ...capabilities,
  };
}
