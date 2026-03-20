import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import type { ChatMessageRow } from "@/lib/types/comms";

export async function sendTextMessage(input: {
  conversationId: string;
  senderOrbitId: string;
  receiverOrbitId?: string;
  body: string;
}): Promise<ChatMessageRow> {
  const safeBody = DOMPurify.sanitize(input.body, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  const row = {
    id: `msg_${Math.random().toString(36).slice(2, 11)}`,
    conversation_id: input.conversationId,
    sender_orbit_id: input.senderOrbitId,
    receiver_orbit_id: input.receiverOrbitId ?? null,
    type: "text",
    body: safeBody,
    metadata: null,
    read_at: null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error("sendTextMessage error", error);
    throw error;
  }

  // Update conversation last_message_at
  await (supabase as any)
    .from("conversations_v2")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.conversationId);

  return data as ChatMessageRow;
}

export async function createCallSystemMessage(input: {
  conversationId: string;
  senderOrbitId: string | null;
  receiverOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert({
      id: `msg_${Math.random().toString(36).slice(2, 11)}`,
      conversation_id: input.conversationId,
      sender_orbit_id: input.senderOrbitId,
      receiver_orbit_id: input.receiverOrbitId ?? null,
      type: "call",
      body: input.body,
      metadata: input.metadata ?? null,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error("createCallSystemMessage error", error);
  }
}

export async function loadConversationMessages(
  conversationId: string
): Promise<ChatMessageRow[]> {
  const { data, error } = await (supabase as any)
    .from("chat_messages_v2")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("loadConversationMessages error", error);
    throw error;
  }

  return (data ?? []) as ChatMessageRow[];
}

export async function markMessageRead(messageId: string) {
  const { error } = await (supabase as any)
    .from("chat_messages_v2")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    console.error("markMessageRead error", error);
  }
}
