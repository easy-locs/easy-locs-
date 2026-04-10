/**
 * HudConversationList — WhatsApp-style conversation sidebar.
 * Supports swipe-to-reveal (More + Archive) and contextual "More" bottom sheet.
 * Archived section displayed at top like WhatsApp.
 * Fully i18n-aware.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, MessageCircle, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationThread } from "./types";
import HudConversationCard from "./HudConversationCard";
import SwipeableThreadItem from "./SwipeableThreadItem";
import ThreadContextMenu from "./ThreadContextMenu";
import ScrollableFilterBar from "@/components/ui/ScrollableFilterBar";
import { useI18n } from "@/lib/i18n";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";

interface Props {
  threads: ConversationThread[];
  loading: boolean;
  selectedThread: ConversationThread | null;
  onSelectThread: (thread: ConversationThread) => void;
  onDeleteThread?: (thread: ConversationThread) => void;
  onArchiveThread?: (thread: ConversationThread) => void;
  onMuteThread?: (thread: ConversationThread) => void;
  onBlockThread?: (thread: ConversationThread) => void;
  onClearThread?: (thread: ConversationThread) => void;
  onFavoriteThread?: (thread: ConversationThread) => void;
  onMarkUnreadThread?: (thread: ConversationThread) => void;
  onContactInfo?: (thread: ConversationThread) => void;
  onStatusChange?: (thread: ConversationThread, status: string) => void;
  onSecurity?: (thread: ConversationThread) => void;
  onSafetyNumber?: (thread: ConversationThread) => void;
  onDetails?: (thread: ConversationThread) => void;
  onSelectMessages?: (thread: ConversationThread) => void;
  visible: boolean;
  multiSelectActive?: boolean;
}

export default function HudConversationList({
  threads, loading, selectedThread, onSelectThread,
  onDeleteThread, onArchiveThread, onMuteThread, onBlockThread, onClearThread,
  onFavoriteThread, onMarkUnreadThread, onContactInfo, onStatusChange, onSecurity, onSafetyNumber,
  onDetails, onSelectMessages,
  visible, multiSelectActive,
}: Props) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [contextMenuThread, setContextMenuThread] = useState<ConversationThread | null>(null);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);

  const handleSwipeOpen = useCallback((id: string | null) => {
    setActiveSwipeId(id);
  }, []);

  const handleFilterChange = useCallback((f: string) => {
    setActiveFilter(f);
    setActiveSwipeId(null);
  }, []);

  const handleThreadSelect = useCallback((thread: ConversationThread) => {
    setActiveSwipeId(null);
    trackOrbitEvent("orbit.conversation.opened", { screen: "conversation_list", component: "HudConversationList", action: "select_thread", payload: { threadId: thread.id, type: thread.conversationType }, result: "success" });
    onSelectThread(thread);
  }, [onSelectThread]);

  useEffect(() => {
    setActiveSwipeId(null);
  }, [selectedThread?.id]);

  useEffect(() => {
    if (multiSelectActive) setActiveSwipeId(null);
  }, [multiSelectActive]);

  const FILTERS = useMemo(() => [
    { value: "all", label: t("filter.all") || "All" },
    { value: "unread", label: t("filter.unread") || "Unread" },
    { value: "favorites", label: t("filter.favorites") || "Favorites" },
    { value: "groups", label: t("filter.groups") || "Groups" },
  ], [t]);

  const archivedThreads = useMemo(() =>
    threads.filter(t => !!t.archived),
    [threads]
  );

  const filteredThreads = useMemo(() => {
    if (showArchived) {
      return archivedThreads.filter(t => !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    const filtered = threads
      .filter(t => {
        if (t.archived) return false;
        if (activeFilter === "all") return true;
        if (activeFilter === "unread") return (t.unreadCount ?? 0) > 0;
        if (activeFilter === "favorites") return !!t.pinned || !!t.is_favorite;
        if (activeFilter === "groups") return t.conversationType === "group" || t.conversationType === "team";
        return false;
      })
      .filter(t => !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.propertyLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bookingId?.includes(searchQuery) ||
        t.leadId?.includes(searchQuery)
      );
    const pinned = filtered.filter(t => t.pinned);
    const unpinned = filtered.filter(t => !t.pinned);
    return [...pinned, ...unpinned];
  }, [threads, archivedThreads, activeFilter, searchQuery, showArchived]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, unread: 0, favorites: 0, groups: 0 };
    for (const th of threads) {
      if (th.archived) continue;
      counts.all++;
      if ((th.unreadCount ?? 0) > 0) counts.unread++;
      if (th.pinned || th.is_favorite) counts.favorites++;
      if (th.conversationType === "group" || th.conversationType === "team") counts.groups++;
    }
    return counts;
  }, [threads]);

  const handleDelete = useCallback((thread: ConversationThread) => {
    onDeleteThread?.(thread);
  }, [onDeleteThread]);

  const handleArchive = useCallback((thread: ConversationThread) => {
    onArchiveThread?.(thread);
  }, [onArchiveThread]);

  const handleMore = useCallback((thread: ConversationThread) => {
    setContextMenuThread(thread);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="w-full md:w-[clamp(18rem,30vw,24rem)] flex flex-col border-e"
      style={{
        background: "hsl(var(--background))",
        borderColor: "hsl(var(--border) / 0.06)",
      }}
    >
      {/* Header + Search */}
      <div className="px-4 pt-4 pb-2 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("orbit.search_conversations")}
            className="search-premium-field pl-10 h-11 text-sm font-medium rounded-2xl border-none"
            style={{
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
            }}
          />
        </div>

        {!showArchived && (
          <ScrollableFilterBar
            options={FILTERS.map(f => ({
              id: f.value,
              label: f.label,
              count: filterCounts[f.value] || 0,
            }))}
            value={activeFilter}
            onChange={handleFilterChange}
            showCounts
          />
        )}
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-0.5 px-2 py-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-[10px]">
                <Skeleton className="h-[50px] w-[50px] rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* Archived row at top (like WhatsApp) */}
            {!showArchived && archivedThreads.length > 0 && (
              <button
                onClick={() => { setShowArchived(true); setActiveSwipeId(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/10 active:bg-muted/20 border-b"
                style={{ borderColor: "hsl(var(--border) / 0.06)" }}
              >
                <div className="h-[42px] w-[42px] rounded-full flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
                  <Archive className="h-5 w-5" style={{ color: "hsl(var(--muted-foreground))" }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[15px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                    {t("orbit.archived")}
                  </span>
                </div>
                <span className="text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>
                  {archivedThreads.length}
                </span>
              </button>
            )}

            {/* Back from archived view */}
            {showArchived && (
              <button
                onClick={() => { setShowArchived(false); setActiveSwipeId(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/10 border-b"
                style={{ borderColor: "hsl(var(--border) / 0.06)" }}
              >
                <Archive className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--primary))" }}>
                  {t("orbit.back_to_chats")}
                </span>
              </button>
            )}

            {filteredThreads.length === 0 ? (
              <div className="py-16 text-center px-6">
                <MessageCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.15)" }} />
                <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                  {showArchived
                    ? (t("orbit.no_archived"))
                    : (t("orbit.no_conversations"))}
                </p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
                  {showArchived
                    ? (t("orbit.swipe_archive"))
                    : (t("orbit.messages_appear"))}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.06)" }}>
                {filteredThreads.map((thread, i) => (
                  <SwipeableThreadItem
                    key={thread.id}
                    itemId={thread.id}
                    activeSwipeId={activeSwipeId}
                    onSwipeOpen={handleSwipeOpen}
                    onDelete={() => handleDelete(thread)}
                    onArchive={() => handleArchive(thread)}
                    onMore={() => handleMore(thread)}
                    isArchived={!!thread.archived}
                    disabled={!!multiSelectActive}
                  >
                    <HudConversationCard
                      thread={thread}
                      isActive={selectedThread?.id === thread.id}
                      index={i}
                      onClick={() => handleThreadSelect(thread)}
                    />
                  </SwipeableThreadItem>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Context menu bottom sheet */}
      {contextMenuThread && (
        <ThreadContextMenu
          thread={contextMenuThread}
          open={!!contextMenuThread}
           onClose={() => setContextMenuThread(null)}
          onMute={() => onMuteThread?.(contextMenuThread)}
          onDelete={() => onDeleteThread?.(contextMenuThread)}
          onBlock={() => onBlockThread?.(contextMenuThread)}
          onClearChat={() => onClearThread?.(contextMenuThread)}
          onFavorite={() => onFavoriteThread?.(contextMenuThread)}
          onArchive={() => onArchiveThread?.(contextMenuThread)}
          onMarkUnread={() => onMarkUnreadThread?.(contextMenuThread)}
          onContactInfo={() => onContactInfo?.(contextMenuThread)}
          onStatusChange={onStatusChange ? (status) => onStatusChange(contextMenuThread, status) : undefined}
          onSecurity={onSecurity ? () => onSecurity(contextMenuThread) : undefined}
          onSafetyNumber={onSafetyNumber ? () => onSafetyNumber(contextMenuThread) : undefined}
          onDetails={onDetails ? () => onDetails(contextMenuThread) : undefined}
          onSelectMessages={onSelectMessages ? () => onSelectMessages(contextMenuThread) : undefined}
        />
      )}
    </div>
  );
}
