import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function sendSystemMessage(params: {
  conversationId: string;
  senderUserId: string;
  senderOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown> | null;
}) {
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("chat_messages_v2")
    .insert({
      conversation_id: params.conversationId,
      sender_user_id: params.senderUserId,
      sender_orbit_id:
        params.senderOrbitId || `orbit_${params.senderUserId.slice(0, 12)}`,
      type: "system",
      body: params.body,
      metadata: params.metadata ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  await db
    .from("conversations_v2")
    .update({
      last_message_at: now,
      last_message_preview: params.body.slice(0, 120),
      updated_at: now,
    })
    .eq("id", params.conversationId);

  return data;
}
