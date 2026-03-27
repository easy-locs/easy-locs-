import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import type { ChatMessageRow } from "@/lib/types/comms";
import { sendInAppNotification } from "@/lib/notifications/notification-dispatcher";

/**
 * Resolves the current auth user ID. Required for sender_user_id (NOT NULL).
 */
async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/**
 * Resolves orbit_id for a user. Falls back to deterministic format.
 */
async function resolveOrbitId(userId: string): Promise<string> {
  const { data } = await (supabase as any)
    .from("orbit_profiles_v2")
    .select("orbit_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.orbit_id || `orbit_${userId.slice(0, 12)}`;
}

export async function sendTextMessage(input: {
  conversationId: string;
  senderOrbitId?: string;
  senderDisplayName?: string;
  receiverOrbitId?: string;
  body: string;
}): Promise<ChatMessageRow> {
  const userId = await getCurrentUserId();

  // Always resolve a valid orbit_id — never send null
  const senderOrbitId = input.senderOrbitId || await resolveOrbitId(userId);

  // GUARD: prevent sending message to self
  if (input.receiverOrbitId && senderOrbitId === input.receiverOrbitId) {
    throw new Error("Cannot send a message to yourself");
  }

  const safeBody = DOMPurify.sanitize(input.body, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  const { data, error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: userId,
      sender_orbit_id: senderOrbitId,
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

  // Notify other participants (non-blocking)
  void notifyConversationParticipants({
    conversationId: input.conversationId,
    messageId: data.id,
    senderUserId: userId,
    senderDisplayName: input.senderDisplayName || senderOrbitId,
    bodyPreview: safeBody.slice(0, 120),
  });

  return data as ChatMessageRow;
}

/**
 * Notify all conversation participants (except sender) about a new message.
 */
async function notifyConversationParticipants(ctx: {
  conversationId: string;
  messageId: string;
  senderUserId: string;
  senderDisplayName: string;
  bodyPreview: string;
}) {
  try {
    const { data: conv } = await (supabase as any)
      .from("conversations_v2")
      .select("participants")
      .eq("id", ctx.conversationId)
      .single();

    if (!conv?.participants || !Array.isArray(conv.participants)) return;

    const recipients = conv.participants
      .filter((p: any) => p.userId && p.userId !== ctx.senderUserId)
      .map((p: any) => p.userId as string);

    await Promise.allSettled(
      recipients.map((targetUserId: string) =>
        sendInAppNotification({
          userId: targetUserId,
          type: "new_message",
          eventType: "chat.message.created",
          domain: "orbit",
          actor: "client",
          title: ctx.senderDisplayName || "New message",
          body: ctx.bodyPreview,
          deepLink: `/orbit/conversations/${ctx.conversationId}`,
          dedupKey: `chat.message.created:${ctx.messageId}:${targetUserId}`,
          data: {
            conversationId: ctx.conversationId,
            messageId: ctx.messageId,
            senderUserId: ctx.senderUserId,
          },
          relatedConversationId: ctx.conversationId,
        })
      )
    );
  } catch (err) {
    console.error("[notifyConversationParticipants] error:", err);
  }
}

export async function createCallSystemMessage(input: {
  conversationId: string;
  senderOrbitId?: string | null;
  receiverOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const userId = await getCurrentUserId();
  const senderOrbitId = input.senderOrbitId || await resolveOrbitId(userId);

  const { error } = await (supabase as any)
    .from("chat_messages_v2")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: userId,
      sender_orbit_id: senderOrbitId,
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
