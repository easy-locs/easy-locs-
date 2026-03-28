/**
 * orbit-message-repository — Atomic unit: CRUD operations for chat messages.
 * Single responsibility: message persistence layer.
 */
import { supabase } from "@/integrations/supabase/client";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";

export interface MessageInput {
  conversationId: string;
  senderUserId: string;
  senderOrbitId?: string;
  body: string;
  type?: string;
  metadata?: Record<string, any>;
  replyToId?: string;
}

export async function insertMessage(input: MessageInput): Promise<any> {
  return withHealthTracking("orbit", "insertMessage", async () => {
    const { data, error } = await (supabase as any)
      .from("chat_messages_v2")
      .insert({
        conversation_id: input.conversationId,
        sender_user_id: input.senderUserId,
        sender_orbit_id: input.senderOrbitId ?? null,
        body: input.body,
        type: input.type ?? "text",
        metadata: input.metadata ?? {},
        reply_to_message_id: input.replyToId ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation last_message
    await (supabase as any)
      .from("conversations_v2")
      .update({
        last_message: input.body.slice(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", input.conversationId);

    return data;
  });
}

export async function fetchMessages(conversationId: string, limit = 50, before?: string): Promise<any[]> {
  return withHealthTracking("orbit", "fetchMessages", async () => {
    let query = (supabase as any)
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data } = await query;
    return (data ?? []).reverse();
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await (supabase as any)
    .from("chat_messages_v2")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);
}
