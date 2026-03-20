import { supabase } from "@/integrations/supabase/client";
import type { ConversationParticipant, ConversationRow } from "@/lib/types/comms";

/**
 * Creates or retrieves a direct conversation between two orbit participants.
 * Searches for existing conversation by participant orbit IDs before creating.
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

  // Try to find existing direct conversation with both participants
  const { data: existing } = await (supabase as any)
    .from("conversations_v2")
    .select("*")
    .eq("type", "direct")
    .contains("participants", [{ orbitId: input.myOrbitId }])
    .contains("participants", [{ orbitId: input.peerOrbitId }])
    .maybeSingle();

  if (existing) return existing as ConversationRow;

  // Create new direct conversation
  const { data, error } = await (supabase as any)
    .from("conversations_v2")
    .insert({
      type: "direct",
      title: null,
      created_by_orbit_id: input.myOrbitId,
      participants,
      last_message_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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
