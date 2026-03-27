import { supabase } from "@/integrations/supabase/client";
import type { ConversationParticipant, ConversationRow } from "@/lib/types/comms";

const db = supabase as any;

type Params = {
  myUserId: string;
  myOrbitId?: string | null;
  myEmail?: string | null;
  myDisplayName?: string | null;
  peerUserId: string;
  peerOrbitId?: string | null;
  peerEmail?: string | null;
  peerDisplayName?: string | null;
};

function normalizeParticipants(params: Params): ConversationParticipant[] {
  return [
    {
      userId: params.myUserId,
      orbitId: params.myOrbitId ?? null,
      email: params.myEmail ?? null,
      displayName: params.myDisplayName ?? null,
    },
    {
      userId: params.peerUserId,
      orbitId: params.peerOrbitId ?? null,
      email: params.peerEmail ?? null,
      displayName: params.peerDisplayName ?? null,
    },
  ];
}

export async function createOrGetDirectConversation(params: Params): Promise<ConversationRow> {
  if (params.myUserId === params.peerUserId) {
    throw new Error("Cannot create a conversation with yourself");
  }

  const participants = normalizeParticipants(params);
  const userIds = [params.myUserId, params.peerUserId].sort();

  // Find existing direct conversation with these exact user IDs
  const { data: existing, error: existingError } = await db
    .from("conversations_v2")
    .select("*")
    .eq("type", "direct")
    .contains("metadata", { direct_user_ids: userIds })
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as ConversationRow;

  const { data, error } = await db
    .from("conversations_v2")
    .insert({
      type: "direct",
      participants,
      metadata: { direct_user_ids: userIds },
      last_message_at: new Date().toISOString(),
      last_message_preview: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ConversationRow;
}
