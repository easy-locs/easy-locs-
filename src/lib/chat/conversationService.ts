import { supabase } from "@/integrations/supabase/client";
import type { ConversationParticipant, ConversationRow, ChatMessageRow } from "@/lib/types/comms";

const db = supabase as any;

/**
 * Creates or retrieves a direct conversation between two orbit participants.
 * Stores participants as JSONB objects: [{orbitId, email, displayName}]
 * AND as a flat orbitId array for RLS containment matching.
 */
export async function createOrGetDirectConversation(input: {
  myOrbitId: string;
  myEmail?: string | null;
  myDisplayName?: string | null;
  peerOrbitId: string;
  peerEmail?: string | null;
  peerDisplayName?: string | null;
}): Promise<ConversationRow> {
  // GUARD: prevent self-conversations
  if (input.myOrbitId === input.peerOrbitId) {
    throw new Error("Cannot create a conversation with yourself");
  }

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

  // Find existing direct conversation containing both participants
  // Use JSONB containment on orbitId field inside array objects
  const { data: existingRows, error: findErr } = await db
    .from("conversations_v2")
    .select("*")
    .eq("type", "direct")
    .contains("participants", [{ orbitId: input.myOrbitId }])
    .contains("participants", [{ orbitId: input.peerOrbitId }])
    .limit(10);

  if (findErr) {
    console.error("createOrGetDirectConversation lookup error", findErr);
    throw findErr;
  }

  // Find the one that is exactly 2 participants (direct)
  const existing = (existingRows ?? []).find(
    (row: any) => Array.isArray(row.participants) && row.participants.length === 2
  );

  if (existing) return existing as ConversationRow;

  // Create new — let DB generate UUID id
  const { data, error } = await db
    .from("conversations_v2")
    .insert({
      type: "direct",
      title: null,
      created_by_orbit_id: input.myOrbitId,
      participants,
      last_message_at: null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("createOrGetDirectConversation create error", error);
    throw error;
  }

  return data as ConversationRow;
}

/**
 * Lists all conversations the current user participates in, ordered by last message.
 */
export async function listMyConversations(): Promise<ConversationRow[]> {
  const { data, error } = await db
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
  const { data, error } = await db
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
