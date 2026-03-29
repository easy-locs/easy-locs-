/**
 * Chat repo extended — Uses real tables: conversations_v2 + chat_messages_v2.
 * This replaces the old broken version that queried non-existent tables.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ConversationRecord, ChatMessageRecord } from "@/lib/types/domain";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const chatRepoExtended = {
  /**
   * List conversations for a user by orbit_id.
   * IDENTITY: participants JSONB stores { orbitId, userId, ... }.
   * We try orbitId JSONB contains first, then fall back to userId contains,
   * ensuring conversations are found regardless of which identity was stored.
   */
  async listConversationsByOrbitId(orbitId: string): Promise<ConversationRecord[]> {
    // Primary: match by orbitId in participants
    let { data, error } = await db
      .from("conversations_v2")
      .select("*")
      .contains("participants", [{ orbitId }])
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.warn("[chatRepoExtended] listConversationsByOrbitId error:", error.message);
    }

    // Fallback: if no results and orbitId doesn't look like "orbit_*",
    // it might be an auth.uid — try matching by userId in participants
    if ((!data || data.length === 0) && orbitId && !orbitId.startsWith("orbit_")) {
      const fallback = await db
        .from("conversations_v2")
        .select("*")
        .contains("participants", [{ userId: orbitId }])
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (!fallback.error && fallback.data?.length) {
        data = fallback.data;
      }
    }

    const mapRow = (row: any): ConversationRecord => ({
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
    });

    return (data ?? []).map(mapRow) as ConversationRecord[];
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
