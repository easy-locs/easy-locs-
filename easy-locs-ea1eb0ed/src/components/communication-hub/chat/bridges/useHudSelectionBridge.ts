/**
 * useHudSelectionBridge — Selection mode sync for HudChatPanel.
 * Owns: global selection ↔ conversation alignment, composer visibility flag.
 */
import { useEffect, useRef } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import { useOrbitSelectionStore } from "@/stores/orbit/selection.store";

export function useHudSelectionBridge(currentConversationId: string) {
  const setActiveConversation = useOrbitComposerStore((s) => s.setActiveConversation);
  const globalSelectionMode = useOrbitSelectionStore((s) => s.mode);
  const globalSelectionConvId = useOrbitSelectionStore((s) => s.conversationId);
  const clearGlobalSelection = useOrbitSelectionStore((s) => s.clearSelection);

  const prevConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    const target = currentConversationId || null;
    if (prevConvIdRef.current !== target) {
      prevConvIdRef.current = target;
      setActiveConversation(target);
    }

    if (globalSelectionConvId && globalSelectionConvId !== currentConversationId) {
      clearGlobalSelection();
    }
  }, [currentConversationId, setActiveConversation, globalSelectionConvId, clearGlobalSelection]);

  const composerVisible = globalSelectionMode !== "selecting";

  return {
    globalSelectionMode,
    clearGlobalSelection,
    composerVisible,
  };
}
