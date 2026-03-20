import { supabase } from "@/integrations/supabase/client";
import type { ConversationParticipant, ConversationRow, ChatMessageRow } from "@/lib/types/comms";

/**
 * Creates or retrieves a direct conversation between two orbit participants.
 */
export async function createOrGetDirectConversation(input: {
  myOrbitId: string;
  myEmail?: string | null;
  myDisplayName?: string | null;
  peerOrbitId: string;
  peerEmail?: string | null;
  peerDisplayName?: string | null;
}): Promise<ConversationRow> {
  const p1: ConversationParticipant = {
    orbitId: input.myOrbitId,
    email: input.myEmail ?? null,
    displayName: input.myDisplayName ?? null,
  };

  const p2: ConversationParticipant = {
    orbitId: input.peerOrbitId,
    email: input.peerEmail ?? null,
    displayName: input.peerDisplayName ?? null,
  };

  const participants = [p1, p2].sort((a, b) => a.orbitId.localeCompare(b.orbitId));
  const conversationId = `dm_${participants.map((x) => x.orbitId).join("_")}`;

  // Try to find existing
  const { data: existing } = await (supabase as any)
    .from("conversations_v2")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (existing) return existing as ConversationRow;

  // Create new
  const row = {
    id: conversationId,
    created_by_orbit_id: input.myOrbitId,
    participants,
    last_message_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from("conversations_v2")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error("createOrGetDirectConversation error", error);
    throw error;
  }

  return data as ConversationRow;
}

/**
 * Lists all conversations the current user participates in, ordered by last message.
 */
export async function listMyConversations(): Promise<ConversationRow[]> {
  const { data, error } = await (supabase as any)
    .from("conversations_v2")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("listMyConversations error", error);
    throw error;
  }

  return (data ?? []) as ConversationRow[];
}

/**
 * Loads all messages for a conversation, ordered chronologically.
 */
export async function getConversationMessages(
  conversationId: string
): Promise<ChatMessageRow[]> {
  const { data, error } = await (supabase as any)
    .from("chat_messages_v2")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getConversationMessages error", error);
    throw error;
  }

  return (data ?? []) as ChatMessageRow[];
}
