/**
 * HudConversationList — WhatsApp-style conversation sidebar.
 * Supports swipe-to-delete and swipe-to-archive on each thread card.
 */
import { useState, useMemo, useCallback } from "react";
import { Search, Loader2, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConversationThread } from "./types";
import HudConversationCard from "./HudConversationCard";
import SwipeableThreadItem from "./SwipeableThreadItem";
import ScrollableFilterBar from "@/components/ui/ScrollableFilterBar";

interface Props {
  threads: ConversationThread[];
  loading: boolean;
  selectedThread: ConversationThread | null;
  onSelectThread: (thread: ConversationThread) => void;
  onDeleteThread?: (thread: ConversationThread) => void;
  onArchiveThread?: (thread: ConversationThread) => void;
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
  { value: "archived", label: "Archived" },
];

export default function HudConversationList({
  threads, loading, selectedThread, onSelectThread,
  onDeleteThread, onArchiveThread, visible, multiSelectActive,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredThreads = useMemo(() =>
    threads
      .filter(t => {
        const isArchived = !!t.archived;
        if (activeFilter === "archived") return isArchived;
        if (isArchived) return false;
        return activeFilter === "all" || t.conversationType === activeFilter || t.bookingType === activeFilter || t.sourceModule === activeFilter;
      })
      .filter(t => !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.propertyLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bookingId?.includes(searchQuery) ||
        t.leadId?.includes(searchQuery)
      ),
    [threads, activeFilter, searchQuery]
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, archived: 0 };
    for (const t of threads) {
      if (t.archived) { counts.archived++; continue; }
      counts.all++;
      counts[t.conversationType] = (counts[t.conversationType] || 0) + 1;
    }
    return counts;
  }, [threads]);

  const handleDelete = useCallback((thread: ConversationThread) => {
    onDeleteThread?.(thread);
  }, [onDeleteThread]);

  const handleArchive = useCallback((thread: ConversationThread) => {
    onArchiveThread?.(thread);
  }, [onArchiveThread]);

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
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }} />
            <p className="text-xs mt-3" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>Loading…</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="py-16 text-center px-6">
            <MessageCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.15)" }} />
            <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              {activeFilter === "archived" ? "No archived conversations" : "No conversations"}
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
              {activeFilter === "archived"
                ? "Swipe right on a conversation to archive it"
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
      </ScrollArea>
    </div>
  );
}
