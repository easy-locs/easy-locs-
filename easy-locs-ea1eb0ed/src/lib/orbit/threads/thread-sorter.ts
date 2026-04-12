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
      seen.set(key, t);
    }
  }

  if (dupCount > 0) {
    console.log(`[thread-sorter] Dedup removed ${dupCount} duplicate(s) using canonical render keys`);
  }

  return Array.from(seen.values());
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

export { getCanonicalRenderKey };