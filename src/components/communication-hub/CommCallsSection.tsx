/**
 * CommCallsSection — Call history with single direction icon per entry.
 * Uses HUD tokens. Functional redial. Swipe-to-delete. Fully i18n'd.
 * Resolves orbit IDs to display names — NEVER shows UUIDs.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/components/call/CallProvider";
import { useI18n } from "@/lib/i18n";
import {
  Phone, PhoneMissed, Video, Search, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import SwipeableCallItem from "./SwipeableCallItem";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCallStatus, safeDisplayName, isUUID } from "@/lib/orbit/message-formatter";

type CallFilter = "all" | "missed" | "incoming" | "outgoing";

interface CallLog {
  id: string;
  conversation_id: string;
  session_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: string;
  direction: string;
  status: string;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_sec: number;
  created_at: string;
}

function formatCallTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM");
}

function formatDuration(s: number | null): string {
  if (!s) return "";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

export default function CommCallsSection() {
  const { user } = useAuth();
  const { startCall, isInCall, isStartingCall } = useCall();
  const { t } = useI18n();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CallFilter>("all");
  const [search, setSearch] = useState("");
  // Resolved display names cache: orbitId → displayName
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  const loadCalls = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const { data: callData, error } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!callData || callData.length === 0) {
        setCalls([]);
        setLoading(false);
        return;
      }

      setCalls(callData as unknown as CallLog[]);

      // Resolve orbit IDs → display names
      const orbitIds = new Set<string>();
      callData.forEach((c: any) => {
        if (c.caller_orbit_id && isUUID(c.caller_orbit_id)) orbitIds.add(c.caller_orbit_id);
        if (c.receiver_orbit_id && isUUID(c.receiver_orbit_id)) orbitIds.add(c.receiver_orbit_id);
      });
      if (orbitIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", Array.from(orbitIds));
        if (profiles) {
          const cache: Record<string, string> = {};
          profiles.forEach((p: any) => {
            cache[p.id] = p.full_name || p.email || p.phone || "Contact";
          });
          setNameCache(cache);
        }
      }
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load calls");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  const handleRedial = useCallback(async (call: CallLog) => {
    if (isInCall || isStartingCall) {
      toast.info(t("orbit.calls.in_progress") || "Call already in progress");
      return;
    }

    haptic("medium");
    const peerId = call.caller_orbit_id === user?.id ? call.receiver_orbit_id : call.caller_orbit_id;

    await startCall({
      orgId: peerId,
      contextType: "direct",
      peerName: peerId,
      isVideo: call.call_type === "video",
    });
  }, [startCall, isInCall, isStartingCall, user?.id]);

  const filtered = calls.filter(c => {
    if (filter === "missed" && c.status !== "missed") return false;
    if (filter === "incoming" && c.direction !== "incoming") return false;
    if (filter === "outgoing" && c.direction !== "outgoing") return false;
    if (search) {
      const q = search.toLowerCase();
      const searchable = [c.caller_orbit_id, c.receiver_orbit_id].join(" ").toLowerCase();
      return searchable.includes(q);
    }
    return true;
  });

  const filters: { id: CallFilter; label: string }[] = [
    { id: "all", label: t("orbit.calls.all") || "All" },
    { id: "missed", label: t("orbit.calls.missed") || "Missed" },
    { id: "incoming", label: t("orbit.calls.incoming") || "In" },
    { id: "outgoing", label: t("orbit.calls.outgoing") || "Out" },
  ];

  const missedCount = calls.filter(c => c.status === "missed").length;

  /** Single unified call icon with direction arrow overlay */
  const getCallIcon = (call: CallLog) => {
    const isOutgoing = call.direction === "outgoing";
    const isMissed = call.status === "missed";
    const isVideoCall = call.call_type === "video";

    const color = isMissed
      ? "hsl(var(--hud-danger))"
      : isOutgoing
        ? "hsl(var(--hud-cyan))"
        : "hsl(var(--hud-success))";

    const MainIcon = isVideoCall ? Video : Phone;
    const ArrowIcon = isMissed
      ? PhoneMissed
      : isOutgoing
        ? ArrowUpRight
        : ArrowDownLeft;

    return (
      <div className="relative">
        <MainIcon className="h-4.5 w-4.5" style={{ color, width: 18, height: 18 }} />
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
          style={{
            width: 12,
            height: 12,
            background: "hsl(var(--hud-bg))",
            border: `1.5px solid ${color}`,
          }}
        >
          <ArrowIcon style={{ width: 7, height: 7, color }} />
        </div>
      </div>
    );
  };

  const getDisplayLabel = (call: CallLog) => {
    const peerId = call.direction === "outgoing" ? call.receiver_orbit_id : call.caller_orbit_id;
    const resolvedName = nameCache[peerId] || safeDisplayName(peerId, call.direction === "outgoing" ? (t("orbit.calls.outgoing_call") || "Outgoing call") : (t("orbit.calls.incoming_call") || "Incoming call"));
    return [resolvedName];
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-lg font-bold mb-3" style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.calls.title") || "Calls"}</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.calls.search") || "Search…"}
            className="pl-9 h-9 text-sm border-0"
            style={{
              background: "hsl(var(--hud-surface))",
              color: "hsl(var(--hud-text))",
            }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => { haptic("selection"); setFilter(f.id); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === f.id ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface) / 0.5)",
                color: filter === f.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.6)",
                border: `1px solid ${filter === f.id ? "hsl(var(--hud-cyan) / 0.2)" : "transparent"}`,
              }}
            >
              {f.label}
              {f.id === "missed" && missedCount > 0 && (
                <span className="ml-1 text-2xs font-bold" style={{ color: "hsl(var(--hud-danger))" }}>
                  {missedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="space-y-1 px-1 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Phone className="h-10 w-10 mb-3" style={{ color: "hsl(var(--destructive) / 0.4)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              {t("orbit.calls.failed_load") || "Failed to load calls"}
            </p>
            <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {loadError}
            </p>
            <button
              onClick={loadCalls}
              className="text-xs font-semibold px-4 py-2 rounded-lg min-h-[44px] transition-colors"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
            >
              {t("orbit.calls.retry") || "Retry"}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Phone className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {filter === "missed" ? (t("orbit.calls.no_missed") || "No missed calls") : (t("orbit.calls.no_calls") || "No calls yet")}
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
              {t("orbit.calls.start_hint") || "Start a call from any conversation"}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map(call => {
              const labels = getDisplayLabel(call);
              const primaryLabel = labels[0];
              const secondaryLabel = labels.length > 1 ? labels[1] : null;

              const handleDeleteCall = async () => {
                const { error } = await supabase.from("call_logs").delete().eq("id", call.id);
                if (error) { toast.error(t("orbit.calls.delete_failed") || "Failed to delete call"); return; }
                setCalls(prev => prev.filter(c => c.id !== call.id));
                toast.success(t("orbit.calls.deleted") || "Call deleted");
              };

              return (
                <SwipeableCallItem key={call.id} onDelete={handleDeleteCall}>
                  <button
                    type="button"
                    onClick={() => void handleRedial(call)}
                    disabled={isInCall || isStartingCall}
                    className="w-full flex items-center gap-3 px-3 py-3 transition-colors text-left disabled:opacity-60"
                    style={{ background: "hsl(var(--hud-bg))" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--hud-surface) / 0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "hsl(var(--hud-bg))")}
                  >
                    {/* Single unified icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: call.status === "missed"
                          ? "hsl(var(--hud-danger) / 0.08)"
                          : "hsl(var(--hud-surface))",
                      }}
                    >
                      {getCallIcon(call)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm font-medium truncate block"
                        style={{
                          color: call.status === "missed" ? "hsl(var(--hud-danger))" : "hsl(var(--hud-text))",
                        }}
                      >
                        {primaryLabel}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {secondaryLabel && (
                          <span className="text-token-xs truncate max-w-[140px]" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>
                            {secondaryLabel}
                          </span>
                        )}
                        {secondaryLabel && <span className="text-token-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.25)" }}>·</span>}
                        <span className="text-token-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                          {formatCallStatus(call.status === "ended" ? `${formatDuration(call.duration_sec) || "Call ended"}` : call.status)}
                        </span>
                      </div>
                    </div>

                    {/* Time */}
                    <span className="text-token-xs tabular-nums shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {formatCallTime(call.created_at)}
                    </span>
                  </button>
                </SwipeableCallItem>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
