/**
 * ConversationList — Layer 1: Conversation sidebar.
 * Shows all conversations with type badges, search, and category filters.
 */
import { useState, useMemo } from "react";
import { Search, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "@/lib/date-locales";
import type { ConversationThread } from "./types";
import { CONVERSATION_FILTERS } from "./types";

interface Props {
  threads: ConversationThread[];
  loading: boolean;
  selectedThread: ConversationThread | null;
  onSelectThread: (thread: ConversationThread) => void;
  visible: boolean;
}

export default function ConversationList({ threads, loading, selectedThread, onSelectThread, visible }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredThreads = useMemo(() =>
    threads
      .filter(t => {
        if (activeFilter === "all") return true;
        // Primary match on conversationType
        if (t.conversationType === activeFilter) return true;
        // "team" threads also show under "direct" since there's no dedicated team tab
        if (activeFilter === "direct" && t.conversationType === "team") return true;
        return false;
      })
      .filter(t => filterProperty === "all" || t.propertyId === filterProperty)
      .filter(t => !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.propertyLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bookingId?.includes(searchQuery) ||
        t.leadId?.includes(searchQuery)
      ),
    [threads, activeFilter, filterProperty, searchQuery]
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: threads.length };
    for (const t of threads) {
      counts[t.conversationType] = (counts[t.conversationType] || 0) + 1;
      // Team threads also count under "direct"
      if (t.conversationType === "team") {
        counts["direct"] = (counts["direct"] || 0) + 1;
      }
    }
    return counts;
  }, [threads]);

  if (!visible) return null;

  return (
    <div className="w-full md:w-80 lg:w-96 border-e border-border/50 flex flex-col" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="ps-9 h-9 text-sm border-0 rounded-xl"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {CONVERSATION_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0"
              style={{
                background: activeFilter === f.value ? "hsl(var(--primary) / 0.1)" : "hsl(var(--hud-surface) / 0.5)",
                color: activeFilter === f.value ? "hsl(var(--primary))" : "hsl(var(--hud-text-dim) / 0.6)",
                border: `1px solid ${activeFilter === f.value ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
              }}
            >
              {f.emoji && <span className="mr-1">{f.emoji}</span>}
              {f.label}
              {(filterCounts[f.value] || 0) > 0 && (
                <span className="ml-1 opacity-60">{filterCounts[f.value]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-3">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 bg-muted animate-pulse rounded" />
                  <div className="h-2.5 w-40 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>No conversations</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Messages will appear here</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filteredThreads.map((thread) => {
              const isActive = selectedThread?.id === thread.id;

              return (
                <button
                  key={thread.id}
                  onClick={() => onSelectThread(thread)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors"
                  style={{
                    background: isActive ? "hsl(var(--primary) / 0.06)" : "transparent",
                  }}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{
                    background: "hsl(var(--hud-cyan) / 0.1)",
                  }}>
                    <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                      {(typeof thread.name === "string" ? thread.name : "?")[0]?.toUpperCase() || "?"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] line-clamp-1 break-words ${thread.unreadCount > 0 ? "font-bold" : "font-medium"}`}
                        style={{ color: "hsl(var(--hud-text))" }}>
                        {thread.name}
                      </p>
                      {thread.lastMessageTime && (
                        <span className="text-[10px] shrink-0 tabular-nums" style={{
                          color: thread.unreadCount > 0 ? "hsl(var(--primary))" : "hsl(var(--hud-text-dim) / 0.4)",
                        }}>
                          {formatDistanceToNow(new Date(thread.lastMessageTime), { addSuffix: false, locale: fr })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-[11px] line-clamp-1 break-words ${thread.unreadCount > 0 ? "font-medium" : ""}`}
                        style={{ color: thread.unreadCount > 0 ? "hsl(var(--hud-text) / 0.7)" : "hsl(var(--hud-text-dim) / 0.45)" }}>
                        {thread.lastMessage
                          ? thread.lastMessage.replace(/\s*\[[^\]]+\]/g, "").slice(0, 50)
                          : thread.serviceTitle || thread.listingTitle || thread.email || "—"}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1 text-[10px] font-bold shrink-0"
                          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
