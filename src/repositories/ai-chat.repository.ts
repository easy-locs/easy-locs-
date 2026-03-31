/**
 * AI Chat Repository — Canonical DB access for ai_chat_* tables.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export const aiChatRepo = {
  threads: {
    insert(payload: Record<string, unknown>) {
      return db.from("ai_chat_threads").insert(payload).select("*").single();
    },
  },
  messages: {
    insert(payload: Record<string, unknown>) {
      return db.from("ai_chat_messages").insert(payload);
    },
    listByThread(threadId: string, limit = 30) {
      return db.from("ai_chat_messages")
        .select("role,content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(limit);
    },
  },
  usage: {
    insert(payload: Record<string, unknown>) {
      return db.from("ai_chat_usage").insert(payload);
    },
  },
  invoke(fnName: string, body: Record<string, unknown>) {
    return supabase.functions.invoke(fnName, { body });
  },
};
