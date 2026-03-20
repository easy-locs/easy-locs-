import { supabase } from "@/integrations/supabase/client";
import type { ConversationRecord, ChatMessageRecord } from "@/lib/types/domain";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const chatRepoExtended = {
  async listConversationsByOrbitId(orbitId: string): Promise<ConversationRecord[]> {
    const { data, error } = await db
      .from("conversations")
      .select("*")
      .contains("participants", [{ orbitId }])
      .order("updatedAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ConversationRecord[];
  },

  async getConversationById(id: string): Promise<ConversationRecord | null> {
    const { data, error } = await db
      .from("conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as ConversationRecord | null;
  },

  async updateConversation(
    id: string,
    patch: Partial<ConversationRecord>
  ): Promise<ConversationRecord> {
    const { data, error } = await db
      .from("conversations")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ConversationRecord;
  },

  async listMessages(conversationId: string): Promise<ChatMessageRecord[]> {
    const { data, error } = await db
      .from("chat_messages")
      .select("*")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ChatMessageRecord[];
  },
};
