/**
 * useHudContextMenuBridge — Stable context-menu callback for message rows.
 */
import { useCallback } from "react";

export function useHudContextMenuBridge(
  setContextMessage: (msg: any) => void,
) {
  const stableContextMenu = useCallback((_: any, msg: any, isMe: boolean) => {
    setContextMessage({
      msgId: msg.id,
      content: msg.content,
      isMe,
      createdAt: msg.created_at,
      hasAudio: !!msg.audio_url,
      hasAttachment: !!msg.attachment_url,
      senderId: msg.sender_id,
      canModerate: false,
      isStarred: !!msg.starred,
    });
  }, [setContextMessage]);

  return { stableContextMenu };
}
