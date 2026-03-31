/**
 * MessageBubble Read Model — Pure projection for message bubble rendering.
 * No writes. No side effects. No identity resolution.
 *
 * Consumers: MessageBubbleRouter, ImageBubble, VideoBubble, TextBubble, etc.
 */

import { isOutgoingMessage, isSystemMessage, resolveSenderDisplay } from "@/domains/orbit/resolvers";
import type { SenderDisplayInfo } from "@/domains/orbit/resolvers";

export interface MessageBubbleReadModel {
  id: string;
  conversationId: string;
  body: string;
  messageType: string;
  isOutgoing: boolean;
  isSystem: boolean;
  senderDisplay: SenderDisplayInfo;
  status: string;
  createdAt: string;
  pending: boolean;
  failed: boolean;
  replyTo?: string | null;
  editedAt?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Project a raw message into a bubble read model.
 * Pure function — no store access, no DB calls.
 */
export function selectMessageBubbleModel(
  msg: {
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
    contact_name?: string | null;
  },
  currentUserId: string | null | undefined,
  threadPeer?: { displayName?: string; name?: string; email?: string; avatarUrl?: string; avatar_url?: string } | null,
): MessageBubbleReadModel {
  const conversationId = msg.conversation_id || msg.conversationId || "";
  const isOutgoing = isOutgoingMessage(msg, currentUserId);
  const isSystem = isSystemMessage(msg);
  const senderDisplay = resolveSenderDisplay(msg, currentUserId ?? "", threadPeer);

  return {
    id: msg.id,
    conversationId,
    body: msg.body || msg.content || "",
    messageType: msg.message_type || msg.type || "text",
    isOutgoing,
    isSystem,
    senderDisplay,
    status: msg.status || "sent",
    createdAt: msg.created_at || msg.createdAt || "",
    pending: msg.pending ?? false,
    failed: msg.failed ?? false,
    replyTo: msg.reply_to ?? null,
    editedAt: msg.edited_at ?? null,
    metadata: msg.metadata ?? null,
  };
}
