import { useState, useRef, useEffect, useCallback } from "react";
import { Phone, Video, MoreVertical, ArrowLeft, Link2, CalendarClock, ChevronDown, Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import { resolveCanonicalDisplayIdentity } from "@/lib/orbit/canonical-helpers";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { usePresenceStore } from "@/families/presence";
import { toast } from "sonner";
import { APP_BASE_URL } from "@/lib/app-domain";
import type { ConversationThread } from "../types";
import { EphemeralPolicy, type DisappearTimer } from "@/families/ephemeral/ephemeral-policy";
import { Timer, TimerOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  thread: ConversationThread;
  convStatus: string;
  e2eReady: boolean;
  isInCall: boolean;
  isStartingCall: boolean;
  onBack: () => void;
  onStartCall: (isVideo: boolean) => void;
  onUpdateStatus: (status: string) => void;
  onToggleContext: () => void;
  onShowSecurityPanel: () => void;
  onShowSafetyNumber: () => void;
  onEnterSelectMode: () => void;
  onAvatarTap?: () => void;
  onSearchMessages?: () => void;
  onMuteToggle?: () => void;
  onClearChat?: () => void;
  onBlockContact?: () => void;
  onDisappearTimerChange?: (timer: DisappearTimer) => void;
  disappearTTL?: string;
  t: (key: string) => string;
}

function formatLastSeen(timestamp: number | null, t: (k: string) => string): string {
  if (!timestamp) return t("orbit.tap_for_info");
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("orbit.online");
  if (mins < 60) return t("orbit.last_seen_minutes").replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("orbit.last_seen_hours").replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days === 1) return t("orbit.last_seen_yesterday");
  return t("orbit.last_seen_days").replace("{n}", String(days));
}

export default function ChatHeader({
  thread, isInCall, isStartingCall,
  onBack, onStartCall, onToggleContext,
  onEnterSelectMode, onAvatarTap,
  onSearchMessages, onMuteToggle, onClearChat, onBlockContact,
  onDisappearTimerChange, disappearTTL = "off",
  t,
}: Props) {
  const identity = resolveCanonicalDisplayIdentity({
    display_name: thread.name,
    email: thread.email,
    avatar_url: thread.avatarUrl,
    role: thread.conversationType === "team" ? "Team" : undefined,
    company: thread.propertyLabel || undefined,
  });
  const displayName = identity.displayName;

  const peerId = thread.peerUserId || thread.tenantId || thread.entityId || "";
  const presence = usePresenceStore((s) => s.getPresence(peerId));
  const isOnline = presence.isOnline;
  const subtitle = isOnline ? t("orbit.online") : formatLastSeen(presence.lastSeenAt, t);

  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleIdentityTap = () => {
    haptic("light");
    if (onAvatarTap) onAvatarTap();
    else onToggleContext();
  };

  const openInlineSearch = useCallback(() => {
    setShowInlineSearch(true);
    setSearchQuery("");
    setSearchResults([]);
    setActiveResultIdx(0);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const closeInlineSearch = useCallback(() => {
    setShowInlineSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setActiveResultIdx(0);
      return;
    }
    const q = query.toLowerCase();
    const messageElements = document.querySelectorAll("[data-msg-content]");
    const matches: number[] = [];
    messageElements.forEach((el, idx) => {
      const content = el.getAttribute("data-msg-content")?.toLowerCase() || el.textContent?.toLowerCase() || "";
      if (content.includes(q)) matches.push(idx);
    });
    setSearchResults(matches);
    setActiveResultIdx(0);
    if (matches.length > 0) {
      messageElements[matches[0]]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const navigateResult = useCallback((direction: "up" | "down") => {
    if (searchResults.length === 0) return;
    const newIdx = direction === "down"
      ? (activeResultIdx + 1) % searchResults.length
      : (activeResultIdx - 1 + searchResults.length) % searchResults.length;
    setActiveResultIdx(newIdx);
    const messageElements = document.querySelectorAll("[data-msg-content]");
    const target = messageElements[searchResults[newIdx]];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      (target as HTMLElement).style.outline = "2px solid hsl(var(--primary))";
      (target as HTMLElement).style.borderRadius = "12px";
      setTimeout(() => {
        (target as HTMLElement).style.outline = "";
        (target as HTMLElement).style.borderRadius = "";
      }, 1500);
    }
  }, [searchResults, activeResultIdx]);

  return (
    <div className="shrink-0" style={{
      borderBottom: "1px solid hsl(var(--border) / 0.08)",
      background: "hsl(var(--card) / 0.5)",
      backdropFilter: "blur(12px)",
    }}>
      <AnimatePresence mode="wait">
        {showInlineSearch ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="px-2 py-1.5 flex items-center gap-2"
          >
            <button onClick={closeInlineSearch} className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-[hsl(var(--card))]">
              <ArrowLeft className="h-4 w-4" style={{ color: "hsl(var(--foreground))" }} />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={t("orbit.search_in_chat") || "Search in chat..."}
                className="pl-9 pr-3 h-8 text-sm border-0 rounded-xl"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                onKeyDown={e => {
                  if (e.key === "Enter") navigateResult("down");
                  if (e.key === "Escape") closeInlineSearch();
                }}
              />
            </div>
            {searchResults.length > 0 && (
              <span className="text-[11px] tabular-nums shrink-0 px-1" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                {activeResultIdx + 1}/{searchResults.length}
              </span>
            )}
            <button onClick={() => navigateResult("up")} className="h-7 w-7 rounded-full flex items-center justify-center" style={{ color: "hsl(var(--muted-foreground))" }}>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => navigateResult("down")} className="h-7 w-7 rounded-full flex items-center justify-center" style={{ color: "hsl(var(--muted-foreground))" }}>
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="px-2 sm:px-3 py-1.5 flex items-center gap-2"
          >
            <button onClick={onBack} className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-[hsl(var(--card))]">
              <ArrowLeft className="h-4 w-4" style={{ color: "hsl(var(--foreground))" }} />
            </button>

            <button onClick={handleIdentityTap} className="shrink-0 relative">
              <IdentityAvatar avatarUrl={identity.avatarUrl} name={displayName} size="sm" />
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ background: "hsl(var(--primary))", borderColor: "hsl(var(--card) / 0.8)" }}>
                  <div className="w-full h-full rounded-full animate-ping" style={{ background: "hsl(var(--primary))", opacity: 0.4 }} />
                </div>
              )}
            </button>

            <div className="min-w-0 flex-1 overflow-hidden" onClick={handleIdentityTap} style={{ cursor: "pointer" }}>
              <p className="text-[13px] font-semibold leading-tight line-clamp-1 break-words" style={{ color: "hsl(var(--foreground))" }}>
                {displayName}
              </p>
              <p className="text-[10.5px] leading-tight mt-0.5" style={{
                color: isOnline ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)",
              }}>
                {subtitle}
              </p>
            </div>

            <div className="flex items-center shrink-0">
              <button
                onClick={openInlineSearch}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--card))]"
              >
                <Search className="h-[17px] w-[17px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={isInCall || isStartingCall}>
                  <button
                    className="h-8 rounded-full flex items-center gap-0.5 px-1.5 transition-colors hover:bg-[hsl(var(--card))] disabled:opacity-40"
                  >
                    <Phone className="h-[17px] w-[17px]" style={{ color: "hsl(var(--primary))" }} />
                    <ChevronDown className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52" style={{
                  background: "hsl(var(--background))",
                  borderColor: "hsl(var(--border) / 0.15)",
                  backdropFilter: "blur(20px)",
                }}>
                  <DropdownMenuItem onClick={() => {
                    haptic("light");
                    trackOrbitEvent("orbit.call.started", { screen: "chat", component: "ChatHeader", action: "audio_call", result: "success" });
                    onStartCall(false);
                  }} className="py-2.5">
                    <Phone className="h-4 w-4 mr-3" style={{ color: "hsl(var(--primary))" }} />
                    <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.voice_call")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    haptic("light");
                    trackOrbitEvent("orbit.call.started", { screen: "chat", component: "ChatHeader", action: "video_call", result: "success" });
                    onStartCall(true);
                  }} className="py-2.5">
                    <Video className="h-4 w-4 mr-3" style={{ color: "hsl(var(--primary))" }} />
                    <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.video_call")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ background: "hsl(var(--border) / 0.1)" }} />
                  <DropdownMenuItem onClick={async () => {
                    haptic("light");
                    const link = `${APP_BASE_URL}/orbit/call/${thread.id}`;
                    navigator.clipboard.writeText(link).then(() => {
                      toast.success(t("orbit.call_link_copied"));
                    }).catch(() => {
                      toast.info(link);
                    });
                  }} className="py-2.5">
                    <Link2 className="h-4 w-4 mr-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                    <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.send_call_link")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    haptic("light");
                    toast.info(t("orbit.schedule_soon"));
                  }} className="py-2.5">
                    <CalendarClock className="h-4 w-4 mr-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                    <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.schedule_call")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--card))] touch-target">
                    <MoreVertical className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" style={{
                  background: "hsl(var(--background))",
                  borderColor: "hsl(var(--border) / 0.15)",
                  backdropFilter: "blur(20px)",
                }}>
                  <DropdownMenuItem onClick={onToggleContext} className="py-2.5">
                    <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.details")}</span>
                  </DropdownMenuItem>
                  {onMuteToggle && (
                    <DropdownMenuItem onClick={() => { haptic("light"); onMuteToggle(); }} className="py-2.5">
                      <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.mute")}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => { haptic("light"); onEnterSelectMode(); }} className="py-2.5">
                    <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.select_messages")}</span>
                  </DropdownMenuItem>
                  {onDisappearTimerChange && (
                    <>
                      <DropdownMenuSeparator style={{ background: "hsl(var(--border) / 0.1)" }} />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          haptic("light");
                          const options = EphemeralPolicy.getTimerOptions();
                          const currentIdx = options.findIndex(o => o.value === disappearTTL);
                          const nextIdx = (currentIdx + 1) % options.length;
                          const next = options[nextIdx];
                          onDisappearTimerChange(next.value);
                          toast.success(next.value === "off" ? t("orbit.disappearing_off") : `${t("orbit.disappearing_messages")}: ${next.label}`);
                        }}
                        className="py-2.5"
                      >
                        {disappearTTL !== "off"
                          ? <Timer className="h-4 w-4 mr-3" style={{ color: "hsl(var(--primary))" }} />
                          : <TimerOff className="h-4 w-4 mr-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                        }
                        <span style={{ color: "hsl(var(--foreground))" }}>
                          {disappearTTL !== "off"
                            ? `${t("orbit.disappearing_messages")}: ${EphemeralPolicy.getTimerOptions().find(o => o.value === disappearTTL)?.label || disappearTTL}`
                            : t("orbit.disappearing_messages")
                          }
                        </span>
                      </DropdownMenuItem>
                    </>
                  )}
                  {onClearChat && (
                    <>
                      <DropdownMenuSeparator style={{ background: "hsl(var(--border) / 0.1)" }} />
                      <DropdownMenuItem onClick={() => { haptic("light"); onClearChat(); }} className="py-2.5">
                        <span style={{ color: "hsl(var(--foreground))" }}>{t("orbit.clear_chat")}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  {onBlockContact && (
                    <DropdownMenuItem onClick={() => { haptic("light"); onBlockContact(); }} className="py-2.5">
                      <span style={{ color: "hsl(var(--destructive))" }}>{t("orbit.block")}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
