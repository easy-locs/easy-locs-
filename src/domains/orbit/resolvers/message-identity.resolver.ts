/**
 * message-identity.resolver — SINGLE canonical source for message sender/receiver resolution.
 *
 * RULES:
 * - isOutgoingMessage: the ONE function to determine if a message is outgoing
 * - resolveSenderDisplay: the ONE function to produce sender name for a message bubble
 * - resolveSenderAvatar: the ONE function to produce sender avatar for a message bubble
 * - getPeerUserId: the ONE function to get the other participant in a direct conversation
 *
 * NO component, page, or hook may compute these independently.
 */

import { resolveDisplayName, resolveAvatar, type IdentitySource } from "./identity.resolver";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

// ── Outgoing / Incoming ──

/**
 * isOutgoingMessage — SINGLE canonical check for message direction.
 * Must be used everywhere instead of inline `msg.sender_id === userId`.
 */
export function isOutgoingMessage(
  senderIdOrMsg: string | { sender_id?: string | null; senderId?: string | null },
  currentUserId: string | null | undefined,
): boolean {
  if (!currentUserId) return false;
  const senderId = typeof senderIdOrMsg === "string"
    ? senderIdOrMsg
    : (senderIdOrMsg.sender_id ?? senderIdOrMsg.senderId ?? null);
  return senderId === currentUserId;
}

/**
 * isSystemMessage — canonical check for system-generated messages.
 */
export function isSystemMessage(
  msg: { sender_id?: string | null; senderId?: string | null; message_type?: string | null; type?: string | null },
): boolean {
  const senderId = msg.sender_id ?? msg.senderId ?? null;
  const msgType = msg.message_type ?? msg.type ?? null;
  return msgType === "system" || senderId === SYSTEM_SENDER_ID;
}

// ── Sender Display ──

export interface SenderDisplayInfo {
  displayName: string;
  avatarUrl: string | null;
  isSystem: boolean;
  isOutgoing: boolean;
}

/**
 * resolveSenderDisplay — SINGLE source of truth for message sender display info.
 *
 * Priority:
 * 1. System message → "System"
 * 2. Outgoing → "You" (or currentUserName if provided)
 * 3. Contact name from message metadata
 * 4. Thread/conversation peer name
 * 5. Identity resolver fallback
 */
export function resolveSenderDisplay(
  msg: {
    sender_id?: string | null;
    senderId?: string | null;
    contact_name?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  currentUserId: string | null | undefined,
  threadPeer?: IdentitySource | null,
): SenderDisplayInfo {
  const system = isSystemMessage(msg as any);
  if (system) {
    return { displayName: "System", avatarUrl: null, isSystem: true, isOutgoing: false };
  }

  const outgoing = isOutgoingMessage(msg as any, currentUserId);

  // For incoming messages, resolve sender display from available sources
  const contactName = msg.contact_name
    || (msg.metadata?.contact_name as string)
    || null;

  const senderSource: IdentitySource = {
    displayName: contactName,
    name: threadPeer?.name ?? threadPeer?.displayName ?? null,
    email: threadPeer?.email ?? null,
    avatarUrl: threadPeer?.avatarUrl ?? threadPeer?.avatar_url ?? null,
  };

  return {
    displayName: outgoing ? "You" : resolveDisplayName(senderSource),
    avatarUrl: outgoing ? null : resolveAvatar(senderSource),
    isSystem: false,
    isOutgoing: outgoing,
  };
}

// ── Peer Resolution ──

/**
 * getPeerUserId — for direct conversations, returns the other participant's userId.
 */
export function getPeerUserId(
  participantUserIds: string[] | null | undefined,
  currentUserId: string | null | undefined,
): string | null {
  if (!participantUserIds || !currentUserId) return null;
  return participantUserIds.find((id) => id !== currentUserId) ?? null;
}

/**
 * isConsecutiveMessage — determines if a message should be rendered as part of a group.
 * Two messages are consecutive if same sender, no date break, within 2 minutes.
 */
export function isConsecutiveMessage(
  current: { sender_id?: string | null; created_at: string; message_type?: string | null },
  previous: { sender_id?: string | null; created_at: string; message_type?: string | null } | null,
): boolean {
  if (!previous) return false;
  if (previous.message_type === "system" || current.message_type === "system") return false;
  if (previous.sender_id !== current.sender_id) return false;
  const gap = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
  return gap < 120_000; // 2 minutes
}
