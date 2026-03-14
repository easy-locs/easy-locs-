/**
 * HudConversationList — WhatsApp-style conversation sidebar.
 * Supports swipe-to-reveal (More + Archive) and contextual "More" bottom sheet.
 * Archived section displayed at top like WhatsApp.
 */
import { useState, useMemo, useCallback } from "react";
import { Search, Loader2, MessageCircle, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConversationThread } from "./types";
import HudConversationCard from "./HudConversationCard";
import SwipeableThreadItem from "./SwipeableThreadItem";
import ThreadContextMenu from "./ThreadContextMenu";
import ScrollableFilterBar from "@/components/ui/ScrollableFilterBar";

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
  onContactInfo?: (thread: ConversationThread) => void;
  onStatusChange?: (thread: ConversationThread, status: string) => void;
  onSecurity?: (thread: ConversationThread) => void;
  onSafetyNumber?: (thread: ConversationThread) => void;
  onDetails?: (thread: ConversationThread) => void;
  onSelectMessages?: (thread: ConversationThread) => void;
  visible: boolean;
  multiSelectActive?: boolean;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "direct", label: "Direct" },
  { value: "booking", label: "Bookings" },
  { value: "property", label: "Property" },
  { value: "listing", label: "Listings" },
  { value: "deal", label: "Deals" },
];

export default function HudConversationList({
  threads, loading, selectedThread, onSelectThread,
  onDeleteThread, onArchiveThread, onMuteThread, onBlockThread, onClearThread,
  onFavoriteThread, onContactInfo,
  visible, multiSelectActive,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [contextMenuThread, setContextMenuThread] = useState<ConversationThread | null>(null);

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
    return threads
      .filter(t => {
        if (t.archived) return false;
        if (activeFilter === "all") return true;
        if (t.conversationType === activeFilter) return true;
        // "team" threads show under "direct" since there's no dedicated team tab
        if (activeFilter === "direct" && t.conversationType === "team") return true;
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
  }, [threads, archivedThreads, activeFilter, searchQuery, showArchived]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const t of threads) {
      if (t.archived) continue;
      counts.all++;
      counts[t.conversationType] = (counts[t.conversationType] || 0) + 1;
      // Team threads also count under "direct"
      if (t.conversationType === "team") {
        counts["direct"] = (counts["direct"] || 0) + 1;
      }
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
      className="w-full md:w-80 lg:w-[22rem] flex flex-col border-e"
      style={{
        background: "hsl(var(--hud-bg))",
        borderColor: "hsl(var(--hud-border) / 0.06)",
      }}
    >
      {/* Header + Search */}
      <div className="px-4 pt-4 pb-2 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations…"
            className="pl-10 h-9 text-sm rounded-xl border-none"
            style={{
              background: "hsl(var(--hud-surface))",
              color: "hsl(var(--hud-text))",
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
            onChange={setActiveFilter}
            showCounts
          />
        )}
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }} />
            <p className="text-xs mt-3" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>Loading…</p>
          </div>
        ) : (
          <div>
            {/* Archived row at top (like WhatsApp) */}
            {!showArchived && archivedThreads.length > 0 && (
              <button
                onClick={() => setShowArchived(true)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/10 active:bg-muted/20 border-b"
                style={{ borderColor: "hsl(var(--border) / 0.06)" }}
              >
                <div className="h-[42px] w-[42px] rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                  <Archive className="h-5 w-5" style={{ color: "hsl(var(--muted-foreground))" }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[15px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                    Archived
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
                onClick={() => setShowArchived(false)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/10 border-b"
                style={{ borderColor: "hsl(var(--border) / 0.06)" }}
              >
                <Archive className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-sm font-semibold" style={{ color: "hsl(var(--primary))" }}>
                  ← Back to Chats
                </span>
              </button>
            )}

            {filteredThreads.length === 0 ? (
              <div className="py-16 text-center px-6">
                <MessageCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.15)" }} />
                <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                  {showArchived ? "No archived conversations" : "No conversations"}
                </p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
                  {showArchived
                    ? "Swipe left on a conversation → Archive"
                    : "Messages will appear here"}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.06)" }}>
                {filteredThreads.map((thread, i) => (
                  <SwipeableThreadItem
                    key={thread.id}
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
                      onClick={() => onSelectThread(thread)}
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
          onContactInfo={() => onContactInfo?.(contextMenuThread)}
        />
      )}
    </div>
  );
}
