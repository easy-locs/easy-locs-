import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import type { ChatMessageRow } from "@/lib/types/comms";

export async function sendTextMessage(input: {
  conversationId: string;
  senderOrbitId: string;
  receiverOrbitId?: string;
  body: string;
}): Promise<ChatMessageRow> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const safeBody = DOMPurify.sanitize(input.body, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  const { data, error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert({
      conversation_id: input.conversationId,
      sender_orbit_id: input.senderOrbitId,
      sender_user_id: userId,
      receiver_orbit_id: input.receiverOrbitId ?? null,
      type: "text",
      body: safeBody,
    })
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
  receiverOrbitId: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert({
      conversation_id: input.conversationId,
      sender_orbit_id: input.senderOrbitId,
      sender_user_id: userId ?? null,
      receiver_orbit_id: input.receiverOrbitId,
      type: "call",
      body: input.body,
      metadata: input.metadata ?? null,
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
