import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

export async function sendTextMessage(input: {
  conversationId: string;
  senderOrbitId: string;
  receiverOrbitId?: string;
  body: string;
}) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Sanitize body to prevent stored XSS
  const safeBody = DOMPurify.sanitize(input.body, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: input.conversationId,
    sender_orbit_id: input.senderOrbitId,
    sender_user_id: userId,
    type: "text",
    body: safeBody,
  }).select("*").single();

  if (error) {
    console.error("sendTextMessage error", error);
    throw error;
  }

  return data;
}

export async function markMessageRead(messageId: string) {
  const { error } = await (supabase as any)
    .from("chat_messages_v2")
    .update({ metadata: { read: true } })
    .eq("id", messageId);

  if (error) {
    console.error("markMessageRead error", error);
  }
}
