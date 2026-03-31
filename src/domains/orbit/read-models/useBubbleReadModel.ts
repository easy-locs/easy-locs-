/**
 * useBubbleReadModel — React hook that projects raw message + attachment
 * into a canonical MessageBubbleReadModel.
 * 
 * This is the CQRS read-side entry point for ChatMessageBubble.
 * Replaces inline identity resolution and status logic.
 * 
 * STATUS: ACTIVE_CANONICAL
 */

import { useMemo } from "react";
import { selectMessageBubbleModel, type MessageBubbleReadModel } from "./message-bubble.read-model";

interface RawMsg {
  id: string;
  conversation_id?: string;
  conversationId?: string;
  body?: string;
  content?: string;
  message_type?: string;
  type?: string;
  sender_id?: string;
  senderId?: string;
  sender_user_id?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  pending?: boolean;
  failed?: boolean;
  reply_to?: string | null;
  edited_at?: string | null;
  metadata?: Record<string, any> | null;
  contact_name?: string | null;
}

export function useBubbleReadModel(
  msg: RawMsg,
  currentUserId: string | null | undefined,
  threadPeer?: { displayName?: string; name?: string; email?: string; avatarUrl?: string; avatar_url?: string } | null,
): MessageBubbleReadModel {
  return useMemo(
    () => selectMessageBubbleModel(msg, currentUserId, threadPeer),
    [msg.id, msg.status, msg.pending, msg.failed, msg.edited_at, currentUserId],
  );
}
