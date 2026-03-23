/**
 * Chat repo extended — Uses real tables: conversations_v2 + chat_messages_v2.
 * This replaces the old broken version that queried non-existent tables.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ConversationRecord, ChatMessageRecord } from "@/lib/types/domain";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const chatRepoExtended = {
  async listConversationsByOrbitId(orbitId: string): Promise<ConversationRecord[]> {
    const { data, error } = await db
      .from("conversations_v2")
      .select("*")
      .contains("participants", [{ orbitId }])
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.warn("[chatRepoExtended] listConversationsByOrbitId error:", error.message);
      return [];
    }
    // Map DB snake_case to domain camelCase
    return (data ?? []).map((row: any) => ({
      id: row.id,
      type: row.type || "direct",
      participants: row.participants || [],
      title: row.title,
      listingId: row.listing_id,
      bookingId: row.booking_id,
      leaseId: row.lease_id,
      lastMessageAt: row.last_message_at || row.updated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as ConversationRecord[];
  },

  async getConversationById(id: string): Promise<ConversationRecord | null> {
    const { data, error } = await db
      .from("conversations_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("[chatRepoExtended] getConversationById error:", error.message);
      return null;
    }
    if (!data) return null;
    return {
      id: data.id,
      type: data.type || "direct",
      participants: data.participants || [],
      title: data.title,
      listingId: data.listing_id,
      bookingId: data.booking_id,
      leaseId: data.lease_id,
      lastMessageAt: data.last_message_at || data.updated_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ConversationRecord;
  },

  async updateConversation(
    id: string,
    patch: Partial<ConversationRecord>
  ): Promise<ConversationRecord | null> {
    // Map camelCase to snake_case for DB update
    const dbPatch: Record<string, unknown> = {};
    if (patch.lastMessageAt !== undefined) dbPatch.last_message_at = patch.lastMessageAt;
    if (patch.updatedAt !== undefined) dbPatch.updated_at = patch.updatedAt;
    if (patch.title !== undefined) dbPatch.title = patch.title;

    const { data, error } = await db
      .from("conversations_v2")
      .update(dbPatch)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[chatRepoExtended] updateConversation error:", error.message);
      return null;
    }
    return data ? ({
      id: data.id,
      type: data.type,
      participants: data.participants,
      lastMessageAt: data.last_message_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as ConversationRecord) : null;
  },

  async listMessages(conversationId: string): Promise<ChatMessageRecord[]> {
    const { data, error } = await db
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[chatRepoExtended] listMessages error:", error.message);
      return [];
    }
    return (data ?? []).map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderOrbitId: row.sender_orbit_id,
      body: row.body,
      type: row.type || "text",
      metadata: row.metadata,
      createdAt: row.created_at,
    })) as ChatMessageRecord[];
  },
};
