import { supabase } from "@/integrations/supabase/client";
import type { ConversationParticipant, ConversationRow } from "@/lib/types/comms";

const db = supabase as any;

export async function createGroupConversation(input: {
  title: string;
  participants: ConversationParticipant[];
  createdByOrbitId?: string | null;
}): Promise<ConversationRow> {
  const { data, error } = await db
    .from("conversations_v2")
    .insert({
      type: "group",
      title: input.title,
      participants: input.participants,
      created_by_orbit_id: input.createdByOrbitId ?? null,
      last_message_at: new Date().toISOString(),
      metadata: {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ConversationRow;
}
