/**
 * thread-sorter — Atomic unit: normalize, dedup, and sort threads for display.
 * Single responsibility: name normalization + canonical dedup + deterministic sort.
 */
import type { ConversationThread } from "@/components/communication-hub/types";

function getCanonicalRenderKey(t: ConversationThread): string {
  if (t.conversationType === "direct" && t.peerUserId) {
    const pair = [t.peerUserId].sort().join("::");
    return `direct::${pair}`;
  }

  if (t.bookingId) {
    const prefix = t.bookingType === "concierge" ? "concierge" : t.bookingType === "seasonal" ? "seasonal" : "booking";
    return `${prefix}::${t.bookingId}`;
  }

  if (t.tenantId) return `tenant::${t.tenantId}`;
  if (t.leadId) return `lead::${t.leadId}`;
  if (t.dealId) return `deal::${t.dealId}`;

  if (t.entityType === "guest_session" && t.entityId) return `guest::${t.entityId}`;

  if (t.conversationId) return `conv::${t.conversationId}`;

  return `id::${t.id}`;
}

function mergeThreadData(winner: ConversationThread, loser: ConversationThread): void {
  const mergedIds = new Set<string>(winner.mergedConversationIds || []);
  if (winner.conversationId) mergedIds.add(winner.conversationId);
  if (loser.conversationId) mergedIds.add(loser.conversationId);
  if (loser.mergedConversationIds) {
    for (const id of loser.mergedConversationIds) mergedIds.add(id);
  }
  if (mergedIds.size > 0) {
    winner.mergedConversationIds = Array.from(mergedIds);
  }
  if (!winner.lastMessage && loser.lastMessage) {
    winner.lastMessage = loser.lastMessage;
  }
  if (!winner.email && loser.email) winner.email = loser.email;
  if (!winner.phone && loser.phone) winner.phone = loser.phone;
  if (!winner.avatarUrl && loser.avatarUrl) winner.avatarUrl = loser.avatarUrl;
  winner.unreadCount = Math.max(winner.unreadCount || 0, loser.unreadCount || 0);
}

function getIdentityKey(t: ConversationThread): string {
  const normalizedName = (t.name || "").trim().toLowerCase();
  if (!normalizedName || normalizedName === "contact" || normalizedName === "client" || normalizedName === "guest" || normalizedName === "visitor") {
    return "";
  }
  if (t.conversationType === "direct") {
    if (t.peerUserId) return `identity::direct::${t.peerUserId}`;
    return "";
  }
  return `identity::${normalizedName}::${t.conversationType}`;
}

function dedup(threads: ConversationThread[]): ConversationThread[] {
  const seen = new Map<string, ConversationThread>();
  let dupCount = 0;

  for (const t of threads) {
    const key = getCanonicalRenderKey(t);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, t);
      continue;
    }

    dupCount++;
    const existingTime = existing.lastMessageTime || "";
    const currentTime = t.lastMessageTime || "";
    if (currentTime > existingTime) {
      mergeThreadData(t, existing);
      seen.set(key, t);
    } else {
      mergeThreadData(existing, t);
    }
  }

  if (dupCount > 0) {
    console.log(`[thread-sorter] Dedup pass 1 removed ${dupCount} duplicate(s) using canonical render keys`);
  }

  const primaryResult = Array.from(seen.values());
  const identitySeen = new Map<string, ConversationThread>();
  let identityDupCount = 0;

  for (const t of primaryResult) {
    const identityKey = getIdentityKey(t);
    if (!identityKey) {
      identitySeen.set(t.id, t);
      continue;
    }
    const existing = identitySeen.get(identityKey);
    if (!existing) {
      identitySeen.set(identityKey, t);
      continue;
    }

    identityDupCount++;
    const existingTime = existing.lastMessageTime || "";
    const currentTime = t.lastMessageTime || "";
    if (currentTime > existingTime) {
      mergeThreadData(t, existing);
      identitySeen.set(identityKey, t);
    } else {
      mergeThreadData(existing, t);
    }
  }

  if (identityDupCount > 0) {
    console.log(`[thread-sorter] Dedup pass 2 removed ${identityDupCount} duplicate(s) using identity keys (name+type)`);
  }

  return Array.from(identitySeen.values());
}

export function normalizeAndSort(threadMap: Map<string, ConversationThread>): ConversationThread[] {
  const allThreads = Array.from(threadMap.values()).map(t => ({
    ...t,
    name: typeof t.name === "string" ? t.name : (t.name ? String(t.name) : "Contact"),
  }));

  const unique = dedup(allThreads);

  return unique.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    const at = a.lastMessageTime || "";
    const bt = b.lastMessageTime || "";
    return bt.localeCompare(at);
  });
}

export { getCanonicalRenderKey, getIdentityKey };