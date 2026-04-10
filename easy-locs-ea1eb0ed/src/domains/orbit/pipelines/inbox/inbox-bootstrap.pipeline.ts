/**
 * inboxBootstrapPipeline — Hydrate inbox from local cache, then sync.
 * Step 1: Read local cache → display instantly
 * Step 2: Fetch delta from server → merge
 */
import { normalizeConversations } from "../../normalizers";

export interface InboxBootstrapResult {
  conversations: ReturnType<typeof normalizeConversations>;
  fromCache: boolean;
}

/**
 * Bootstrap inbox: normalize raw data from any source.
 */
export function bootstrapInbox(rawConversations: any[]): InboxBootstrapResult {
  const normalized = normalizeConversations(rawConversations);
  // Sort by lastMessageAt descending
  normalized.sort((a, b) => {
    const ta = a.lastMessageAt || a.updatedAt || a.createdAt;
    const tb = b.lastMessageAt || b.updatedAt || b.createdAt;
    return tb.localeCompare(ta);
  });

  return { conversations: normalized, fromCache: false };
}

/**
 * Merge delta conversations into existing list (dedup by id).
 */
export function mergeInboxDelta(
  existing: ReturnType<typeof normalizeConversations>,
  delta: any[],
): ReturnType<typeof normalizeConversations> {
  const normalized = normalizeConversations(delta);
  const map = new Map(existing.map((c) => [c.id, c]));

  for (const c of normalized) {
    const prev = map.get(c.id);
    if (!prev || (c.updatedAt > prev.updatedAt)) {
      map.set(c.id, c);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const ta = a.lastMessageAt || a.updatedAt;
    const tb = b.lastMessageAt || b.updatedAt;
    return (tb || "").localeCompare(ta || "");
  });
}
