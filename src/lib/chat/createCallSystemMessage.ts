import { supabase } from "@/integrations/supabase/client";

/**
 * Insert a "call" type system message into chat_messages_v2.
 * Requires sender_user_id — we resolve it from auth session.
 */
export async function createCallSystemMessage(input: {
  conversationId: string;
  senderOrbitId: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  // We need sender_user_id for the chat_messages_v2 table
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) {
    console.warn("[createCallSystemMessage] No auth user, skipping");
    return;
  }

  const { error } = await (supabase as any).from("chat_messages_v2").insert({
    conversation_id: input.conversationId,
    sender_orbit_id: input.senderOrbitId ?? "",
    sender_user_id: userId,
    type: "call",
    body: input.body,
    metadata: input.metadata ?? null,
  });

  if (error) {
    console.error("[createCallSystemMessage] error", error);
  }
}
