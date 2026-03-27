/**
 * Canonical DB row ↔ domain record mappers for Orbit V2+.
 */
import type {
  ChatMessageRecord,
  ChatMessageRow,
  ConversationRecord,
  ConversationRow,
} from "@/lib/types/comms";

export function mapConversationRow(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    type: row.type,
    participants: row.participants ?? [],
    title: row.title,
    listingId: row.listing_id ?? null,
    bookingId: row.booking_id ?? null,
    leaseId: row.lease_id ?? null,
    contextType: (row.metadata?.context_type as string | undefined) ?? null,
    contextId: (row.metadata?.context_id as string | undefined) ?? null,
    lastMessageAt: row.last_message_at ?? row.updated_at,
    lastMessagePreview: row.last_message_preview ?? null,
    unreadCountCache: row.unread_count_cache ?? 0,
    archived: !!row.archived,
    muted: !!row.muted,
    ghostMode: !!row.ghost_mode,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapChatMessageRow(row: ChatMessageRow): ChatMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    senderOrbitId: row.sender_orbit_id,
    type: row.type,
    body: row.body,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
    replyToMessageId: row.reply_to_message_id,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    failedAt: row.failed_at,
    deletedAt: row.deleted_at,
    editedAt: row.edited_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}
