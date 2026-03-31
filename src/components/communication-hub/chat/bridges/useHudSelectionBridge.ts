/**
 * useHudSelectionBridge — Selection mode sync for HudChatPanel.
 * Owns: global selection ↔ conversation alignment, composer visibility flag.
 */
import { useEffect } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";

export function useHudSelectionBridge(currentConversationId: string) {
  const setActiveConversation = useOrbitComposerStore((s) => s.setActiveConversation);
  const globalSelectionMode = useOrbitSelectionStore((s) => s.mode);
  const globalSelectionConvId = useOrbitSelectionStore((s) => s.conversationId);
  const clearGlobalSelection = useOrbitSelectionStore((s) => s.clearSelection);

  useEffect(() => {
    setActiveConversation(currentConversationId || null);
    if (globalSelectionConvId && globalSelectionConvId !== currentConversationId) {
      clearGlobalSelection();
    }
  }, [currentConversationId]);

  const composerVisible = globalSelectionMode !== "selecting";

  return {
    globalSelectionMode,
    clearGlobalSelection,
    composerVisible,
  };
}
