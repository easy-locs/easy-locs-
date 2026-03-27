/**
 * ConversationList — Layer 1: Conversation sidebar.
 * Shows all conversations with type badges, search, and category filters.
 */
import { useState, useMemo } from "react";
import { Search, MessageCircle, User, Hash, Building, Handshake, Users, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { fr } from "@/lib/date-locales";
import { motion } from "framer-motion";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import type { ConversationThread, ConversationType } from "./types";
import { CONV_TYPE_CONFIG, SOURCE_MODULE_CONFIG, STATUS_COLORS, STATUS_LABELS, CONVERSATION_FILTERS } from "./types";

interface Props {
  threads: ConversationThread[];
  loading: boolean;
  selectedThread: ConversationThread | null;
  onSelectThread: (thread: ConversationThread) => void;
  visible: boolean;
}

const CONV_TYPE_ICONS: Record<ConversationType, any> = {
  direct: MessageCircle,
  business: Building,
  listing: Hash,
  booking: Hash,
  deal: Handshake,
  property: User,
  team: Users,
  order: Hash,
  rent_call: Building,
  payment: Hash,
  travel: Hash,
  service: Hash,
  delivery: Hash,
  support: MessageCircle,
};

export default function ConversationList({ threads, loading, selectedThread, onSelectThread, visible }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");

  const propertyOptions = useMemo(() => {
    const props = new Map<string, string>();
    threads.forEach(t => {
      if (t.propertyId && t.propertyLabel) props.set(t.propertyId, t.propertyLabel);
    });
    return Array.from(props.entries()).map(([id, label]) => ({ id, label }));
  }, [threads]);

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
    <div className="w-full md:w-80 lg:w-96 border-e border-border/50 flex flex-col">
      {/* Search & Filters */}
      <div className="p-2.5 sm:p-3 border-b border-border/50 space-y-2">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="search-premium-field ps-9 h-11 text-sm font-medium rounded-2xl"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CONVERSATION_FILTERS.map(f => (
            <Button
              key={f.value}
              size="sm"
              variant={activeFilter === f.value ? "default" : "ghost"}
              onClick={() => setActiveFilter(f.value)}
              className={`text-xs h-7 min-h-[44px] sm:min-h-0 px-2 gap-1 ${activeFilter === f.value ? "" : "text-muted-foreground"}`}
            >
              {f.emoji && <span>{f.emoji}</span>}
              {f.label}
              {(filterCounts[f.value] || 0) > 0 && (
                <span className="text-[9px] opacity-60">{filterCounts[f.value]}</span>
              )}
            </Button>
          ))}
        </div>
        {propertyOptions.length > 1 && (
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="h-8 text-xs">
              <MapPin className="h-3 w-3 me-1 text-muted-foreground" />
              <span className="truncate">{filterProperty === "all" ? "All properties" : propertyOptions.find(p => p.id === filterProperty)?.label || "Property"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {propertyOptions.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
            <p className="text-xs text-muted-foreground mt-2">Loading conversations…</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No conversations</p>
            <p className="text-xs text-muted-foreground mt-1">Messages will appear here when clients interact.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {filteredThreads.map((thread, i) => {
              const config = CONV_TYPE_CONFIG[thread.conversationType];
              const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];
              const isActive = selectedThread?.id === thread.id;
              const ref = thread.bookingId?.slice(0, 8) || thread.leadId?.slice(0, 8) || thread.dealId?.slice(0, 8) || "";
              const Icon = CONV_TYPE_ICONS[thread.conversationType] || MessageCircle;

              return (
                <motion.button
                  key={thread.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.2) }}
                  onClick={() => onSelectThread(thread)}
                  className={`w-full text-left rounded-xl border transition-all ${
                    isActive
                      ? `${config.border} ${config.bg} border-2 shadow-md`
                      : "border-border/30 hover:border-border/60 hover:bg-muted/30"
                  }`}
                >
                  {/* Header strip */}
                  <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-xl border-b ${
                    isActive ? `${config.bg} ${config.border}` : "bg-muted/20 border-border/10"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${moduleConfig.cls}`}>
                        {moduleConfig.emoji} {moduleConfig.label}
                      </Badge>
                      {thread.propertyCountry && (
                        <span className="text-[11px]">{getCountryEntryOrDefault(thread.propertyCountry).flag}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ref && <span className="text-[9px] font-mono text-muted-foreground opacity-60">#{ref}</span>}
                      {thread.unreadCount > 0 && (
                        <span className="bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 shadow-sm">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${config.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={`min-w-0 flex-1 text-sm leading-snug break-words line-clamp-2 ${thread.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                            {thread.name}
                          </p>
                          {thread.lastMessageTime && (
                            <span className="pt-0.5 text-[10px] text-muted-foreground shrink-0 tabular-nums whitespace-nowrap">
                              {formatDistanceToNow(new Date(thread.lastMessageTime), { addSuffix: false, locale: fr })}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug break-words line-clamp-2">
                          {thread.serviceTitle || thread.listingTitle || thread.propertyLabel || thread.email || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Footer — status + price */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                      <div className="flex items-center gap-1.5">
                        {thread.bookingStatus && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_COLORS[thread.bookingStatus] || "bg-muted text-muted-foreground"}`}>
                            {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                          </Badge>
                        )}
                      </div>
                      {thread.totalPrice != null && thread.totalPrice > 0 && (
                        <span className="text-xs font-bold text-foreground tabular-nums">
                          {thread.totalPrice.toFixed(0)} {(thread.currency || "€").toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Last message preview */}
                    {thread.lastMessage && (
                      <p className={`mt-1 text-[11px] leading-snug break-words line-clamp-2 ${thread.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground/60"}`}>
                        {thread.lastMessage.replace(/\s*\[[^\]]+\]/g, "").slice(0, 60)}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
