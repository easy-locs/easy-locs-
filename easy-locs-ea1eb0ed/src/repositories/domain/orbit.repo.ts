import { domainDb, db } from "@/services/db";
import type { ConversationRecord, ChatMessageRecord } from "@/domains/shared/canonical-types";

export {
  fetchUserConversations,
  fetchUserChatMessages,
  uploadAvatar,
  updateAuthUser,
  updateProfileName,
} from "@/repositories/orbit.repository";

export { chatRepoExtended } from "@/lib/supabase/chat-repo-extended";

export const orbitRepo = {
  async listConversations(orbitId: string): Promise<ConversationRecord[]> {
    const { data, error } = await domainDb.orbit
      .from("conversations_v2")
      .select("*")
      .contains("participants", [{ orbitId }])
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) {
      console.warn("[orbitRepo] listConversations error:", error.message);
      return [];
    }
    return (data ?? []).map(mapConversationRow);
  },

  async getConversation(id: string): Promise<ConversationRecord | null> {
    const { data, error } = await domainDb.orbit
      .from("conversations_v2")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return data ? mapConversationRow(data) : null;
  },

  async listMessages(conversationId: string): Promise<ChatMessageRecord[]> {
    const { data, error } = await domainDb.orbit
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapMessageRow);
  },

  async fetchContacts(orbitId: string) {
    const { data } = await domainDb.orbit
      .from("orbit_contacts_v2")
      .select("*")
      .eq("owner_orbit_id", orbitId);
    return data ?? [];
  },

  async fetchCallLogs(orbitId: string, limit = 50) {
    const { data } = await domainDb.orbit
      .from("call_logs")
      .select("*")
      .or(`caller_orbit_id.eq.${orbitId},callee_orbit_id.eq.${orbitId}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  async fetchAdhanPrefsEnabled(userId: string) {
    const { data } = await db
      .from("adhan_notification_prefs")
      .select("enabled")
      .eq("user_id", userId)
      .single();
    return data;
  },

  async fetchAdhanPrefsFull(userId: string) {
    const { data } = await db
      .from("adhan_notification_prefs")
      .select("enabled, fajr, dhuhr, asr, maghrib, isha, offset_minutes")
      .eq("user_id", userId)
      .single();
    return data;
  },

  async upsertAdhanPrefs(userId: string, enabled: boolean) {
    await db.from("adhan_notification_prefs").upsert({
      user_id: userId,
      enabled,
      updated_at: new Date().toISOString(),
    });
  },
};

interface ConversationRow {
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

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_orbit_id: string | null;
  body: string;
  type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function mapConversationRow(row: ConversationRow): ConversationRecord {
  return {
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
  };
}

function mapMessageRow(row: MessageRow): ChatMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderOrbitId: row.sender_orbit_id ?? "",
    body: row.body,
    type: (row.type || "text") as ChatMessageRecord["type"],
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}
