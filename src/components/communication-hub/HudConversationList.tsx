/**
 * HudConversationList — Command Center conversation sidebar.
 * Dark glass, premium filters, smart search with trust signals.
 */
import { useState, useMemo } from "react";
import { Search, Shield, Loader2, MessageCircle, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import type { ConversationThread } from "./types";
import { CONVERSATION_FILTERS } from "./types";
import HudConversationCard from "./HudConversationCard";

interface Props {
  threads: ConversationThread[];
  loading: boolean;
  selectedThread: ConversationThread | null;
  onSelectThread: (thread: ConversationThread) => void;
  visible: boolean;
}

const HUD_FILTERS = [
  { value: "all", label: "All", icon: "◉" },
  { value: "direct", label: "Direct", icon: "◈" },
  { value: "property", label: "Property", icon: "◇" },
  { value: "booking", label: "Bookings", icon: "◆" },
  { value: "listing", label: "Listings", icon: "▣" },
  { value: "deal", label: "Deals", icon: "⬡" },
  { value: "business", label: "Business", icon: "▤" },
];

export default function HudConversationList({ threads, loading, selectedThread, onSelectThread, visible }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredThreads = useMemo(() =>
    threads
      .filter(t => activeFilter === "all" || t.conversationType === activeFilter || t.bookingType === activeFilter || t.sourceModule === activeFilter)
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
    const counts: Record<string, number> = { all: threads.length };
    for (const t of threads) counts[t.conversationType] = (counts[t.conversationType] || 0) + 1;
    return counts;
  }, [threads]);

  if (!visible) return null;

  return (
    <div
      className="w-full md:w-80 lg:w-[22rem] flex flex-col border-e"
      style={{
        background: "hsl(var(--hud-bg))",
        borderColor: "hsl(var(--hud-border) / 0.1)",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{
                background: "hsl(var(--hud-surface))",
                boxShadow: "0 0 12px hsl(var(--hud-cyan) / 0.15)",
                border: "1px solid hsl(var(--hud-border) / 0.2)",
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                Conversations
              </h2>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {threads.length} threads • {threads.reduce((a, t) => a + t.unreadCount, 0)} unread
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" style={{ color: "hsl(var(--hud-success) / 0.6)" }} />
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(var(--hud-success) / 0.6)" }}>
              Secure
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(var(--hud-text-dim))" }} />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-9 text-sm border-[hsl(var(--hud-border)/0.15)] focus:border-[hsl(var(--hud-border)/0.4)] focus:ring-[hsl(var(--hud-cyan)/0.1)]"
            style={{
              background: "hsl(var(--hud-surface))",
              color: "hsl(var(--hud-text))",
            }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1 flex-wrap">
          {HUD_FILTERS.map(f => {
            const isActive = activeFilter === f.value;
            const count = filterCounts[f.value] || 0;
            return (
              <Button
                key={f.value}
                size="sm"
                variant="ghost"
                onClick={() => setActiveFilter(f.value)}
                className="text-[10px] h-6 px-2 gap-1 rounded-md transition-all"
                style={{
                  background: isActive ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
                  color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
                  border: isActive ? "1px solid hsl(var(--hud-border) / 0.3)" : "1px solid transparent",
                }}
              >
                {f.label}
                {count > 0 && <span className="opacity-50 text-[9px]">{count}</span>}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 h-px" style={{ background: "linear-gradient(to right, transparent, hsl(var(--hud-border) / 0.15), transparent)" }} />

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "hsl(var(--hud-cyan))" }} />
            <p className="text-xs mt-2" style={{ color: "hsl(var(--hud-text-dim))" }}>Syncing channels…</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}
            >
              <MessageCircle className="h-7 w-7" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text))" }}>No conversations</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>Messages will appear when clients interact.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredThreads.map((thread, i) => (
              <HudConversationCard
                key={thread.id}
                thread={thread}
                isActive={selectedThread?.id === thread.id}
                index={i}
                onClick={() => onSelectThread(thread)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom status bar */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)", background: "hsl(var(--hud-bg))" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--hud-success))" }} />
          <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Live sync active
          </span>
        </div>
        <span className="text-[9px] tabular-nums" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          {filteredThreads.length} / {threads.length}
        </span>
      </div>
    </div>
  );
}
