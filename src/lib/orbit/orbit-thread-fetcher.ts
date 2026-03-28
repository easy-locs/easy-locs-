/**
 * orbit-thread-fetcher — Atomic unit: fetch conversation threads from DB.
 * Single responsibility: thread data loading.
 */
import { supabase } from "@/integrations/supabase/client";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";

export interface ThreadSummary {
  id: string;
  title: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participantCount: number;
  threadType: string;
}

export async function fetchThreads(userId: string, limit = 50): Promise<ThreadSummary[]> {
  return withHealthTracking("orbit", "fetchThreads", async () => {
    const { data } = await (supabase as any)
      .from("conversations_v2")
      .select("id, title, thread_type, last_message, last_message_at, created_at")
      .or(`created_by_user_id.eq.${userId},id.in.(select conversation_id from conversation_participants_v2 where user_id = '${userId}')`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    return (data ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      lastMessage: t.last_message,
      lastMessageAt: t.last_message_at,
      unreadCount: 0,
      participantCount: 0,
      threadType: t.thread_type ?? "direct",
    }));
  });
}

export async function fetchThreadById(threadId: string): Promise<ThreadSummary | null> {
  return withHealthTracking("orbit", "fetchThread", async () => {
    const { data } = await (supabase as any)
      .from("conversations_v2")
      .select("id, title, thread_type, last_message, last_message_at")
      .eq("id", threadId)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      title: data.title,
      lastMessage: data.last_message,
      lastMessageAt: data.last_message_at,
      unreadCount: 0,
      participantCount: 0,
      threadType: data.thread_type ?? "direct",
    };
  });
}
