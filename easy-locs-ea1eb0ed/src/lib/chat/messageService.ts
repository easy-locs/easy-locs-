/**
 * messageService — LEGACY message service.
 * 
 * ⚠️ sendTextMessage is DEPRECATED — use orbitDispatch({ type: 'send_text' }) instead.
 * Only sendSystemMessage and createCallSystemMessage remain as they serve
 * non-user-initiated flows (system events, call cards).
 * 
 * All DB access through repositories.
 */
import DOMPurify from "dompurify";
import type { ChatMessageRow } from "@/lib/types/comms";
import { sendInAppNotification } from "@/lib/notifications/notification-dispatcher";
import { getCurrentUserId } from "@/families/identity";
import { insertMessage, fetchGroupMessages, updateMessageFields } from "@/repositories/communication.repository";

/**
 * Resolves orbit_id for a user. Falls back to deterministic format.
 */
async function resolveOrbitId(userId: string): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await db
    .from("orbit_profiles_v2")
    .select("orbit_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.orbit_id || `orbit_${userId.replace(/-/g, "").substring(0, 8)}`;
}

/**
 * @deprecated Use orbitDispatch({ type: 'send_text', conversationId, body }) instead.
 * This function bypasses the Flow Gate system and will be removed.
 */
export async function sendTextMessage(input: {
  conversationId: string;
  senderOrbitId?: string;
  senderDisplayName?: string;
  receiverOrbitId?: string;
  body: string;
}): Promise<ChatMessageRow> {
  if (import.meta.env.DEV) {
    console.warn("[DEPRECATED] sendTextMessage called directly — use orbitDispatch instead", new Error().stack);
  }

  const userId = await getCurrentUserId();
  const senderOrbitId = input.senderOrbitId || await resolveOrbitId(userId);

  if (input.receiverOrbitId && senderOrbitId === input.receiverOrbitId) {
    throw new Error("Cannot send a message to yourself");
  }

  const safeBody = DOMPurify.sanitize(input.body, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

  const data = await insertMessage({
    conversationId: input.conversationId,
    senderUserId: userId,
    senderOrbitId,
    type: "text",
    body: safeBody,
    metadata: { schemaVersion: 1 },
  });

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
 * Send a system-type message (booking created, lease started, etc.)
 * This is NOT a user action — it's a platform event, so it bypasses orbitDispatch.
 */
export async function sendSystemMessage(input: {
  conversationId: string;
  senderOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const userId = await getCurrentUserId();
  const senderOrbitId = input.senderOrbitId || await resolveOrbitId(userId);

  try {
    await insertMessage({
      conversationId: input.conversationId,
      senderUserId: userId,
      senderOrbitId,
      type: "system",
      body: input.body,
      metadata: { schemaVersion: 1, ...(input.metadata ?? {}) },
    });
  } catch (error) {
    console.error("sendSystemMessage error", error);
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

  try {
    await insertMessage({
      conversationId: input.conversationId,
      senderUserId: userId,
      senderOrbitId,
      type: "call",
      body: input.body,
      metadata: { schemaVersion: 1, ...(input.metadata ?? {}) },
    });
  } catch (error) {
    console.error("createCallSystemMessage error", error);
  }
}

export async function loadConversationMessages(
  conversationId: string
): Promise<ChatMessageRow[]> {
  const rows = await fetchGroupMessages(conversationId);
  return rows as ChatMessageRow[];
}

export async function markMessageRead(messageId: string) {
  try {
    await updateMessageFields(messageId, { read_at: new Date().toISOString() });
  } catch (error) {
    console.error("markMessageRead error", error);
  }
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
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: conv } = await db
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
