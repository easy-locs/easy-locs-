import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import type { ChatMessageRow } from "@/lib/types/comms";

/**
 * Resolves the current auth user ID. Required for sender_user_id (NOT NULL).
 */
async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function sendTextMessage(input: {
  conversationId: string;
  senderOrbitId: string;
  receiverOrbitId?: string;
  body: string;
}): Promise<ChatMessageRow> {
  const userId = await getCurrentUserId();

  const safeBody = DOMPurify.sanitize(input.body, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Let DB generate UUID id via gen_random_uuid() default
  const { data, error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: userId,
      sender_orbit_id: input.senderOrbitId,
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
  receiverOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const userId = await getCurrentUserId();

  const { error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: userId,
      sender_orbit_id: input.senderOrbitId,
      receiver_orbit_id: input.receiverOrbitId ?? null,
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
