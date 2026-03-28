/**
 * chat.repository — All chat message DB operations.
 * Extracted from ClientMessages and other comm-hub components.
 */
import { supabase } from "@/integrations/supabase/client";

export async function sendChatMessage(params: {
  conversationId: string;
  senderUserId: string;
  content: string;
  messageType?: string;
  metadata?: any;
}) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    content: params.content,
    message_type: params.messageType || "text",
    metadata: params.metadata || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function sendMediaMessage(params: {
  conversationId: string;
  senderUserId: string;
  content: string;
  mediaUrl: string;
  messageType: string;
  metadata?: any;
}) {
  const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: params.conversationId,
    sender_user_id: params.senderUserId,
    content: params.content,
    message_type: params.messageType,
    metadata: { ...(params.metadata || {}), media_url: params.mediaUrl },
  }).select().single();
  if (error) throw error;
  return data;
}

export async function softDeleteMessage(messageId: string, userId: string, existingMetadata: any) {
  await (supabase as any).from("chat_messages_v2").update({
    metadata: {
      ...(existingMetadata || {}),
      deleted_by: [...((existingMetadata as any)?.deleted_by || []), userId],
    },
  }).eq("id", messageId);
}
