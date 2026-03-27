/**
 * createOrGetDirectConversation — Canonical V2+ direct conversation creator.
 * Uses orbitDb for all DB access.
 */
import { orbitDb } from "@/lib/db/orbitDb";
import type { ConversationParticipant, ConversationRow } from "@/lib/types/comms";

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

  const directUserIds = [params.myUserId, params.peerUserId].sort();

  const { data: existing, error: existingError } = await orbitDb.conversations
    .list()
    .eq("type", "direct")
    .contains("metadata", { direct_user_ids: directUserIds })
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as ConversationRow;

  const participants = normalizeParticipants(params);

  const { data, error } = await orbitDb.conversations.insert({
    type: "direct",
    title: null,
    participants,
    metadata: { direct_user_ids: directUserIds },
    last_message_at: new Date().toISOString(),
    last_message_preview: null,
  });

  if (error) throw error;
  return data as ConversationRow;
}
