import { supabase } from "@/integrations/supabase/client";
import type { ConversationParticipant } from "@/lib/types/orbit-chat";

export async function createOrGetDirectConversation(input: {
  myOrbitId: string;
  myEmail?: string | null;
  myDisplayName?: string | null;
  peerOrbitId: string;
  peerEmail?: string | null;
  peerDisplayName?: string | null;
}) {
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

  const { data, error } = await (supabase as any)
    .from("conversations_v2")
    .upsert({
      id: conversationId,
      type: "direct",
      participants: participants.map((p) => ({
        orbitId: p.orbitId,
        role: "buyer",
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("createOrGetDirectConversation error", error);
    throw error;
  }

  return data;
}
