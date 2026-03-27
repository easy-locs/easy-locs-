/**
 * orbitDb — Canonical V2+ database access layer for Orbit.
 * All Orbit reads/writes MUST go through this module.
 */
import { supabase } from "@/integrations/supabase/client";
import { assertNoLegacyOrbitWrite } from "@/lib/guards/assertNoLegacyOrbit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const orbitDb = {
  conversations: {
    list() {
      return db.from("conversations_v2").select("*");
    },
    byId(id: string) {
      return db.from("conversations_v2").select("*").eq("id", id).single();
    },
    insert(payload: Record<string, unknown>) {
      return db.from("conversations_v2").insert(payload).select("*").single();
    },
    update(id: string, payload: Record<string, unknown>) {
      return db.from("conversations_v2").update(payload).eq("id", id).select("*").single();
    },
  },

  messages: {
    list(conversationId: string) {
      return db
        .from("chat_messages_v2")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
    },
    insert(payload: Record<string, unknown>) {
      return db.from("chat_messages_v2").insert(payload).select("*").single();
    },
    update(id: string, payload: Record<string, unknown>) {
      return db.from("chat_messages_v2").update(payload).eq("id", id).select("*").single();
    },
    markRead(ids: string[]) {
      if (!ids.length) return Promise.resolve({ data: null, error: null });
      return db.from("chat_messages_v2").update({ read_at: new Date().toISOString() }).in("id", ids);
    },
  },

  legacy: {
    forbiddenInsert(table: string) {
      assertNoLegacyOrbitWrite(table);
    },
  },
};
