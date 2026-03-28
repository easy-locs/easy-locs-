/**
 * thread-enricher — Atomic unit: enrich threads with peer profiles, unread counts, last messages.
 * Single responsibility: post-processing enrichment, no structural mapping.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ConversationThread } from "@/components/communication-hub/types";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[THREADS][${step}] ${phase}:`, payload ?? {});
};

export async function enrichPeerProfiles(
  threadMap: Map<string, ConversationThread>,
  allPeerIds: Set<string>
): Promise<void> {
  if (allPeerIds.size === 0) return;
  trace("enrich.profiles", "input", { peerCount: allPeerIds.size });

  const peerIdArr = Array.from(allPeerIds);
  const [{ data: peerProfiles }, { data: peerOrbitProfiles }] = await Promise.all([
    supabase.from("profiles").select("id, email, first_name, last_name, name").in("id", peerIdArr),
    (supabase as any).from("orbit_profiles_v2").select("id, orbit_id, display_name, avatar_url, email").in("id", peerIdArr),
  ]);

  const profileMap = new Map<string, any>((peerProfiles || []).map((p: any) => [p.id, p]));
  const orbitMap = new Map<string, any>((peerOrbitProfiles || []).map((p: any) => [p.id, p]));

  for (const thread of threadMap.values()) {
    if (!thread.isV2 || !thread.peerUserId) continue;
    const base: any = profileMap.get(thread.peerUserId);
    const orbit: any = orbitMap.get(thread.peerUserId);
    if (!base && !orbit) continue;
    const fullName = [base?.first_name, base?.last_name].filter(Boolean).join(" ").trim();
    thread.name = orbit?.display_name || fullName || base?.name || thread.name || "Contact";
    thread.email = orbit?.email || base?.email || thread.email || null;
    thread.avatarUrl = orbit?.avatar_url || thread.avatarUrl || null;
    thread.peerOrbitId = orbit?.orbit_id || thread.peerOrbitId || null;
  }

  trace("enrich.profiles", "output", { enriched: profileMap.size + orbitMap.size });
}

export async function enrichUnreadCounts(
  threadMap: Map<string, ConversationThread>,
  userId: string
): Promise<void> {
  const v2Ids = Array.from(threadMap.values())
    .filter(t => t.isV2 && t.v2ConversationId)
    .map(t => t.v2ConversationId!);

  if (v2Ids.length === 0) return;
  trace("enrich.unread", "input", { v2ConversationCount: v2Ids.length });

  const { data: v2Msgs } = await (supabase as any)
    .from("chat_messages_v2")
    .select("conversation_id, sender_user_id, read_at, body, created_at")
    .in("conversation_id", v2Ids)
    .is("read_at", null)
    .neq("sender_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!v2Msgs?.length) {
    trace("enrich.unread", "output", { unreadMessages: 0 });
    return;
  }

  const convIdToThread = new Map<string, ConversationThread>();
  for (const thread of threadMap.values()) {
    if (thread.isV2 && thread.v2ConversationId) {
      convIdToThread.set(thread.v2ConversationId, thread);
    }
  }

  for (const msg of v2Msgs) {
    const thread = convIdToThread.get(msg.conversation_id);
    if (thread) {
      thread.unreadCount = (thread.unreadCount || 0) + 1;
      if (!thread.lastMessage) {
        thread.lastMessage = msg.body;
        thread.lastMessageTime = msg.created_at;
      }
    }
  }

  trace("enrich.unread", "output", { unreadMessages: v2Msgs.length });
}

export async function enrichLastMessages(
  threadMap: Map<string, ConversationThread>,
  userId: string
): Promise<void> {
  const allConvIds = Array.from(threadMap.values())
    .filter(t => t.v2ConversationId || t.contextId)
    .map(t => t.v2ConversationId || t.contextId!)
    .filter(Boolean);

  const uniqueConvIds = [...new Set(allConvIds)];
  if (uniqueConvIds.length === 0) return;
  trace("enrich.lastMessages", "input", { conversationCount: uniqueConvIds.length });

  const allMsgs: any[] = [];
  const CHUNK = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueConvIds.length; i += CHUNK) {
    chunks.push(uniqueConvIds.slice(i, i + CHUNK));
  }

  const results = await Promise.all(
    chunks.map(ids =>
      (supabase as any)
        .from("chat_messages_v2")
        .select("conversation_id, body, created_at, sender_user_id, type, metadata, read_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(500)
    )
  );

  const seenKeys = new Set<string>();
  for (const res of results) {
    if (res.data) {
      for (const m of res.data) {
        const key = `${m.conversation_id}-${m.created_at}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allMsgs.push(m);
        }
      }
    }
  }

  if (allMsgs.length === 0) {
    trace("enrich.lastMessages", "output", { messagesFound: 0 });
    return;
  }

  const msgByConv = new Map<string, any[]>();
  for (const m of allMsgs) {
    const cid = m.conversation_id;
    if (!cid) continue;
    if (!msgByConv.has(cid)) msgByConv.set(cid, []);
    msgByConv.get(cid)!.push(m);
  }

  for (const [, thread] of threadMap) {
    const convId = thread.v2ConversationId || thread.contextId;
    if (!convId) continue;
    const msgs = msgByConv.get(convId);
    if (!msgs?.length) continue;
    if (!thread.lastMessage) {
      thread.lastMessage = msgs[0].body;
      thread.lastMessageTime = msgs[0].created_at;
    }
    for (const m of msgs) {
      if (!m.read_at && m.sender_user_id !== userId) {
        thread.unreadCount++;
      }
    }
  }

  trace("enrich.lastMessages", "output", { messagesFound: allMsgs.length });
}

export function applyPreferences(
  threadMap: Map<string, ConversationThread>,
  prefs: any[]
): void {
  if (!prefs?.length) return;
  const prefMap = new Map(prefs.map((p: any) => [p.context_id, p]));
  for (const [, thread] of threadMap) {
    const pref: any = prefMap.get(thread.contextId) || prefMap.get(thread.id);
    if (pref) {
      thread.archived = !!pref.archived;
      thread.muted = !!pref.muted;
      thread.pinned = !!pref.favorited;
      if (pref.cleared_at) {
        thread.clearedAt = pref.cleared_at;
        if (thread.lastMessageTime && thread.lastMessageTime < pref.cleared_at) {
          thread.lastMessage = undefined;
          thread.unreadCount = 0;
        }
      }
    }
  }
}