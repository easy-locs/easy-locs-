/**
 * orbit-unread-counter — Atomic unit: compute and track unread message count.
 * Single responsibility: unread badge count for Orbit.
 */
import { db } from "@/services/db";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";
import { crossTabSync, TAB_SYNC_CHANNELS } from "@/lib/cross-tab-sync";

export async function fetchUnreadCount(userId: string): Promise<number> {
  return withHealthTracking("orbit", "unreadCount", async () => {
    const { data } = await db
      .from("conversation_participants_v2")
      .select("conversation_id, unread_count")
      .eq("user_id", userId);

    if (!data) return 0;
    const perConversation: Record<string, number> = {};
    let total = 0;
    for (const r of data as { conversation_id: string; unread_count?: number }[]) {
      const count = r.unread_count ?? 0;
      perConversation[r.conversation_id] = count;
      total += count;
    }
    crossTabSync.publish(TAB_SYNC_CHANNELS.ORBIT_UNREAD, { count: total, perConversation });
    return total;
  });
}

export async function markThreadRead(conversationId: string, userId: string): Promise<void> {
  await db
    .from("conversation_participants_v2")
    .update({ unread_count: 0, last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  crossTabSync.publish(TAB_SYNC_CHANNELS.ORBIT_UNREAD, { count: 0, conversationId });
}
