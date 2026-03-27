/**
 * useMessageSelection — Message multi-select, context menu, and moderation logic.
 * Extracted from HudChatPanel monolith.
 */
import { useState, useCallback } from "react";

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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [contextMessage, setContextMessage] = useState<ContextMenuTarget | null>(null);
  const [replyTo, setReplyTo] = useState<{ msgId: string; content: string; senderName?: string } | null>(null);
  const [forwardData, setForwardData] = useState<{ messageId: string; content: string } | null>(null);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());

  const toggleMsgSelect = useCallback((id: string) => {
    setSelectedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  }, []);

  const enterSelectMode = useCallback((msgId: string) => {
    setSelectMode(true);
    setSelectedMsgIds(new Set([msgId]));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectMode(false);
    setSelectedMsgIds(new Set());
  }, []);

  return {
    selectMode, setSelectMode,
    selectedMsgIds, setSelectedMsgIds,
    contextMessage, setContextMessage,
    replyTo, setReplyTo,
    forwardData, setForwardData,
    hiddenMsgIds, setHiddenMsgIds,
    toggleMsgSelect,
    enterSelectMode,
    clearSelection,
  };
}
