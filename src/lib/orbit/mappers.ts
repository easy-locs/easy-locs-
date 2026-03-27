import type {
  ConversationRow,
  ConversationRecord,
  ChatMessageRow,
  ChatMessageRecord,
} from "@/lib/types/comms";

export function mapConversationRow(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    type: row.type,
    participants: row.participants ?? [],
    title: row.title,
    listingId: row.listing_id,
    bookingId: row.booking_id,
    leaseId: row.lease_id,
    contextType: row.context_type ?? null,
    contextId: row.context_id ?? null,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
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
    attachments: row.attachments ?? [],
    reactions: row.reactions ?? [],
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
