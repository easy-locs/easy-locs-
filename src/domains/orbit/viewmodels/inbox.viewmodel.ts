/**
 * Inbox ViewModel Bridge — Projects orbitStore conversations into stable inbox rows.
 * 
 * OWNER: NO — read-only projection.
 * SOURCE: orbitStore.conversations (canonical) 
 *   + useConversationThreads (runtime transitional, until full migration)
 * OUTPUT: sorted, enriched inbox items for UI consumption.
 */
import { useMemo } from "react";
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import type { OrbitConversation } from "@/domains/orbit/types";

export interface InboxItemViewModel {
  id: string;
  kind: string;
  title: string;
  avatarUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isMuted: boolean;
  isArchived: boolean;
  participantCount: number;
}

function projectConversation(conv: OrbitConversation): InboxItemViewModel {
  return {
    id: conv.id,
    type: conv.type,
    title: conv.title || "Conversation",
    avatarUrl: conv.avatarUrl ?? null,
    lastMessagePreview: conv.lastMessagePreview ?? null,
    lastMessageAt: conv.lastMessageAt ?? null,
    unreadCount: conv.unreadCount ?? 0,
    isMuted: conv.isMuted ?? false,
    isArchived: conv.isArchived ?? false,
    isPinned: conv.isPinned ?? false,
    isMarkedUnread: conv.isMarkedUnread ?? false,
    participantCount: conv.participantIds?.length ?? 0,
  };
}

/**
 * useInboxViewModel — Read-only projection of canonical conversations for inbox UI.
 * Does NOT own data. Does NOT write. Does NOT merge realtime.
 */
export function useInboxViewModel() {
  const conversations = useOrbitStore((s) => s.conversations);

  const items = useMemo(() => {
    const all = Object.values(conversations);
    return all
      .filter((c) => !c.isArchived)
      .map(projectConversation)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });
  }, [conversations]);

  const totalUnread = useMemo(
    () => items.reduce((sum, i) => sum + i.unreadCount, 0),
    [items],
  );

  return { items, totalUnread };
}
