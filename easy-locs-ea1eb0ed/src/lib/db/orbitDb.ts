/**
 * orbitDb — Canonical V2+ database access layer for Orbit.
 * All Orbit reads/writes MUST go through this module.
 */
import { db } from "@/services/db";
import { assertNoLegacyOrbitWrite } from "@/lib/guards/assertNoLegacyOrbit";

 


export const orbitDb = {
  conversations: {
    list() {
      return db("conversations_v2").select("*");
    },
    byId(id: string) {
      return db("conversations_v2").select("*").eq("id", id).single();
    },
    insert(payload: Record<string, unknown>) {
      return db("conversations_v2").insert(payload).select("*").single();
    },
    update(id: string, payload: Record<string, unknown>) {
      return db("conversations_v2").update(payload).eq("id", id).select("*").single();
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
    async insert(payload: Record<string, unknown>) {
      const { insertMessage } = await import("@/repositories/communication.repository");
      const data = await insertMessage({
        conversationId: payload.conversation_id as string,
        senderUserId: payload.sender_user_id as string,
        senderOrbitId: (payload.sender_orbit_id as string) || null,
        type: (payload.type as string) || "text",
        body: (payload.body as string) || "",
        metadata: { schemaVersion: 1, ...(payload.metadata as Record<string, unknown> || {}) },
      });
      return { data, error: null };
    },
    update(id: string, payload: Record<string, unknown>) {
      return db("chat_messages_v2").update(payload).eq("id", id).select("*").single();
    },
    markRead(ids: string[]) {
      if (!ids.length) return Promise.resolve({ data: null, error: null });
      return db("chat_messages_v2").update({ read_at: new Date().toISOString() }).in("id", ids);
    },
  },

  legacy: {
    forbiddenInsert(table: string) {
      assertNoLegacyOrbitWrite(table);
    },
  },
};
