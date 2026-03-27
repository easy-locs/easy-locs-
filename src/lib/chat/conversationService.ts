/**
 * conversationService.ts — RE-EXPORTS from canonical orbit services.
 * This file exists only for backward compatibility with existing imports.
 * All implementations are in src/lib/orbit/ and src/lib/chat/messageService.ts.
 */

// Re-export canonical conversation creators
export { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

// Re-export V2 message operations
export { loadConversationMessages as getConversationMessages } from "@/lib/chat/messageService";

// Re-export conversation list from chat-repo-extended
import { chatRepoExtended } from "@/lib/supabase/chat-repo-extended";
import type { ConversationRow } from "@/lib/types/comms";

export async function listMyConversations(): Promise<ConversationRow[]> {
  // This now goes through chatRepoExtended which queries conversations_v2
  const records = await chatRepoExtended.listConversationsByOrbitId("");
  // Map back to row shape for any consumer expecting ConversationRow
  return records.map((r) => ({
    id: r.id,
    type: r.type as any,
    participants: r.participants as any,
    title: r.title ?? null,
    listing_id: r.listingId ?? null,
    booking_id: r.bookingId ?? null,
    lease_id: r.leaseId ?? null,
    last_message_at: r.lastMessageAt,
    last_message_preview: null,
    unread_count_cache: null,
    archived: null,
    muted: null,
    ghost_mode: null,
    metadata: null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  })) as ConversationRow[];
}
