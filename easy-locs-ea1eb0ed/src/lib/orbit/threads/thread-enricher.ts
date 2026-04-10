import { batchLookupProfiles } from "@/lib/orbit/orbit-data-gateway";
import { resolveDisplayName, resolveAvatar } from "@/domains/orbit/resolvers";
import type { ConversationThread } from "@/components/communication-hub/types";
import { db } from "@/services/db";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[THREADS][${step}] ${phase}:`, payload ?? {});
};

function getConversationId(thread: ConversationThread): string | undefined {
  return thread.conversationId;
}

export async function enrichPeerProfiles(
  threadMap: Map<string, ConversationThread>,
  allPeerIds: Set<string>
): Promise<void> {
  if (allPeerIds.size === 0) return;
  trace("enrich.profiles", "input", { peerCount: allPeerIds.size });

  const peerIdArr = Array.from(allPeerIds);
  const profileMap = await batchLookupProfiles(peerIdArr);

  for (const thread of threadMap.values()) {
    if (!thread.isV2 || !thread.peerUserId) continue;
    const profile = profileMap.get(thread.peerUserId);
    if (!profile) continue;
    thread.name = resolveDisplayName({ displayName: profile.display_name, name: null, firstName: null, lastName: null }) || thread.name || "Contact";
    thread.email = profile.email || thread.email || null;
    thread.avatarUrl = resolveAvatar({ avatarUrl: profile.avatar_url }) || thread.avatarUrl || null;
    thread.peerOrbitId = profile.orbit_id || thread.peerOrbitId || null;
  }

  trace("enrich.profiles", "output", { enriched: profileMap.size });
}

export async function enrichUnreadCounts(
  threadMap: Map<string, ConversationThread>,
  userId: string
): Promise<void> {
  const v2Ids = Array.from(threadMap.values())
    .filter(t => t.isV2 && getConversationId(t))
    .map(t => getConversationId(t)!);

  if (v2Ids.length === 0) return;
  trace("enrich.unread", "input", { conversationCount: v2Ids.length });

  const { data: v2Msgs } = await db
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
    const cid = getConversationId(thread);
    if (thread.isV2 && cid) {
      convIdToThread.set(cid, thread);
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
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const allConvIds = Array.from(threadMap.values())
    .map(t => getConversationId(t))
    .filter((id): id is string => typeof id === "string" && UUID_RE.test(id));

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
      db
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
    const convId = getConversationId(thread) || thread.id;
    if (!convId) continue;
    const msgs = msgByConv.get(convId);
    if (!msgs?.length) continue;
    const latestMsg = msgs[0];
    if (!thread.lastMessage) {
      thread.lastMessage = latestMsg.body;
      thread.lastMessageTime = latestMsg.created_at;
    }
    thread.lastMessageSenderId = latestMsg.sender_user_id;
    if (latestMsg.sender_user_id === userId) {
      thread.lastMessageStatus = latestMsg.read_at ? "read" : "sent";
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
    const pref: any = prefMap.get(thread.id) || prefMap.get(thread.conversationId);
    if (pref) {
      thread.archived = !!pref.archived;
      thread.muted = !!pref.muted;
      thread.pinned = !!pref.favorited;
      if (pref.marked_unread && thread.unreadCount === 0) {
        thread.unreadCount = 1;
      }
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
