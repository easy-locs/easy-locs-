import { domainDb } from "@/services/db";
import type { ConversationRecord, ChatMessageRecord } from "@/domains/shared/canonical-types";

interface ConvRow {
  id: string;
  type: string;
  participants: unknown[];
  title: string | null;
  listing_id: string | null;
  booking_id: string | null;
  lease_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MsgRow {
  id: string;
  conversation_id: string;
  sender_orbit_id: string | null;
  body: string;
  type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const chatRepoExtended = {
  async listConversationsByOrbitId(orbitId: string): Promise<ConversationRecord[]> {
    let { data, error } = await domainDb.orbit
      .from("conversations_v2")
      .select("*")
      .contains("participants", [{ orbitId }])
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.warn("[chatRepoExtended] listConversationsByOrbitId error:", error.message);
    }

    if ((!data || data.length === 0) && orbitId && !orbitId.startsWith("orbit_")) {
      const fallback = await domainDb.orbit
        .from("conversations_v2")
        .select("*")
        .contains("participants", [{ userId: orbitId }])
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (!fallback.error && fallback.data?.length) {
        data = fallback.data;
      }
    }

    const mapRow = (row: ConvRow): ConversationRecord => ({
      id: row.id,
      type: (row.type || "direct") as ConversationRecord["type"],
      participants: (row.participants || []) as ConversationRecord["participants"],
      title: row.title ?? undefined,
      listingId: row.listing_id ?? undefined,
      bookingId: row.booking_id ?? undefined,
      leaseId: row.lease_id ?? undefined,
      lastMessageAt: row.last_message_at || row.updated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

    return (data ?? []).map(mapRow) as ConversationRecord[];
  },

  async getConversationById(id: string): Promise<ConversationRecord | null> {
    const { data, error } = await domainDb.orbit
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
    const dbPatch: Record<string, unknown> = {};
    if (patch.lastMessageAt !== undefined) dbPatch.last_message_at = patch.lastMessageAt;
    if (patch.updatedAt !== undefined) dbPatch.updated_at = patch.updatedAt;
    if (patch.title !== undefined) dbPatch.title = patch.title;

    const { data, error } = await domainDb.orbit
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
    const { data, error } = await domainDb.orbit
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[chatRepoExtended] listMessages error:", error.message);
      return [];
    }
    return (data ?? []).map((row: MsgRow) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderOrbitId: row.sender_orbit_id ?? "",
      body: row.body,
      type: row.type || "text",
      metadata: row.metadata ?? undefined,
      createdAt: row.created_at,
    })) as ChatMessageRecord[];
  },
};
