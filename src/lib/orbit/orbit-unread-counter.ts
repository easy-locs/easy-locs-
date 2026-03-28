/**
 * orbit-unread-counter — Atomic unit: compute and track unread message count.
 * Single responsibility: unread badge count for Orbit.
 */
import { supabase } from "@/integrations/supabase/client";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";

export async function fetchUnreadCount(userId: string): Promise<number> {
  return withHealthTracking("orbit", "unreadCount", async () => {
    const { data } = await (supabase as any)
      .from("conversation_participants_v2")
      .select("unread_count")
      .eq("user_id", userId);

    if (!data) return 0;
    return data.reduce((sum: number, r: any) => sum + (r.unread_count ?? 0), 0);
  });
}

export async function markThreadRead(conversationId: string, userId: string): Promise<void> {
  await (supabase as any)
    .from("conversation_participants_v2")
    .update({ unread_count: 0, last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}
