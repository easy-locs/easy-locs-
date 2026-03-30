/**
 * useOrbitSelection — Facade hook for selection store.
 * Scoped to a single conversationId.
 */
import { useCallback, useMemo } from "react";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";
import type { SelectionCapabilities } from "@/lib/orbit/selection-types";

export function useOrbitSelection(conversationId: string | null) {
  const store = useOrbitSelectionStore();

  const isActiveConversation = store.conversationId === conversationId;
  const selectionMode = isActiveConversation ? store.mode : "idle" as const;
  const selectedIds = isActiveConversation ? store.getSelectedIds() : [];
  const selectedCount = isActiveConversation ? store.selectedCount() : 0;

  const isSelected = useCallback(
    (messageId: string) => isActiveConversation && store.isSelected(messageId),
    [store, isActiveConversation],
  );

  const enterSelectionMode = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      store.enterSelectionMode(conversationId, messageId);
    },
    [store, conversationId],
  );

  const toggleSelection = useCallback(
    (messageId: string) => store.toggleSelection(messageId),
    [store],
  );

  const clearSelection = useCallback(
    () => store.clearSelection(),
    [store],
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
