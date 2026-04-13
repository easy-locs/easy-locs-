/**
 * AI Chat Repository — Canonical DB access for ai_chat_* tables.
 */
import { db } from "@/services/db";



export const aiChatRepo = {
  threads: {
    insert(payload: Record<string, unknown>) {
      return db("ai_chat_threads").insert(payload).select("*").single();
    },
  },
  messages: {
    insert(payload: Record<string, unknown>) {
      return db("ai_chat_messages").insert(payload);
    },
    listByThread(threadId: string, limit = 30) {
      return db("ai_chat_messages")
        .select("role,content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(limit);
    },
  },
  usage: {
    insert(payload: Record<string, unknown>) {
      return db("ai_chat_usage").insert(payload);
    },
  },
  invoke(fnName: string, body: Record<string, unknown>) {
    return db.functions.invoke(fnName, { body });
  },
};
