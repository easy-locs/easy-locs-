/**
 * receipt.controller — SINGLE entry point for read/delivered receipts.
 * 
 * Rules:
 * - No component calls markRead directly
 * - No inline DB update for read_at
 * - All receipt writes go through this controller
 * - Anti-spam: throttle + dedup
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// ── Anti-spam: track recent markRead calls ──
const recentReadConversations = new Map<string, number>();
const READ_THROTTLE_MS = 2000;

/**
 * Mark all unread messages in a conversation as read.
 * Throttled to prevent spam on rapid re-renders.
 */
export async function markConversationMessagesRead(
  conversationId: string,
  userId: string,
): Promise<{ markedCount: number }> {
  if (!conversationId || !userId) return { markedCount: 0 };

  // Throttle: skip if same conversation was marked read recently
  const lastRead = recentReadConversations.get(conversationId);
  if (lastRead && Date.now() - lastRead < READ_THROTTLE_MS) {
    return { markedCount: 0 };
  }
  recentReadConversations.set(conversationId, Date.now());

  try {
    // Fetch unread message IDs
    const { data: unread } = await db
      .from("chat_messages_v2")
      .select("id")
      .eq("conversation_id", conversationId)
      .neq("sender_user_id", userId)
      .is("read_at", null)
      .limit(500);

    const ids = (unread ?? []).map((m: any) => m.id);
    if (ids.length === 0) return { markedCount: 0 };

    // Batch update
    await db
      .from("chat_messages_v2")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);

    return { markedCount: ids.length };
  } catch (err) {
    console.warn("[receipt.controller] markConversationMessagesRead failed:", err);
    return { markedCount: 0 };
  }
}

/**
 * Mark a single message as read.
 */
export async function markSingleMessageRead(
  messageId: string,
  userId: string,
): Promise<void> {
  if (!messageId || !userId) return;

  try {
    await db
      .from("chat_messages_v2")
      .update({ read_at: new Date().toISOString() })
      .eq("id", messageId);
  } catch (err) {
    console.warn("[receipt.controller] markSingleMessageRead failed:", err);
  }
}

/**
 * Clear marked_unread preference for a conversation.
 */
export async function clearMarkedUnread(
  userId: string,
  contextId: string,
): Promise<void> {
  if (!userId || !contextId) return;

  try {
    await db
      .from("conversation_preferences")
      .update({ marked_unread: false })
      .eq("user_id", userId)
      .eq("context_id", contextId);
  } catch {
    // fire-and-forget
  }
}
