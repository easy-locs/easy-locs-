/**
 * CommCallsSection — Real call history from call_logs table.
 * Shows recent, missed, and all calls with redial actions.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video, Search } from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { haptic } from "@/lib/haptics";

type CallFilter = "all" | "missed" | "incoming" | "outgoing";

interface CallLog {
  id: string;
  caller_id: string;
  callee_org_id: string;
  status: string;
  is_video: boolean;
  duration_seconds: number | null;
  created_at: string;
  context_label: string | null;
  context_type: string;
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
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CallFilter>("all");
  const [search, setSearch] = useState("");

  const loadCalls = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setCalls((data as CallLog[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  const filtered = calls.filter(c => {
    if (filter === "missed" && c.status !== "missed") return false;
    if (filter === "incoming" && c.caller_id === user?.id) return false;
    if (filter === "outgoing" && c.caller_id !== user?.id) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.context_label || "").toLowerCase().includes(q);
    }
    return true;
  });

  const filters: { id: CallFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "missed", label: "Missed" },
    { id: "incoming", label: "Incoming" },
    { id: "outgoing", label: "Outgoing" },
  ];

  const getCallIcon = (call: CallLog) => {
    if (call.status === "missed") return <PhoneMissed className="h-4 w-4" style={{ color: "hsl(0, 70%, 60%)" }} />;
    if (call.caller_id === user?.id) return <PhoneOutgoing className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />;
    return <PhoneIncoming className="h-4 w-4" style={{ color: "hsl(142, 70%, 50%)" }} />;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-lg font-bold mb-3" style={{ color: "hsl(var(--hud-text))" }}>Calls</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search calls..."
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
              {f.id === "missed" && calls.filter(c => c.status === "missed").length > 0 && (
                <span className="ml-1 text-[10px] font-bold" style={{ color: "hsl(0, 70%, 60%)" }}>
                  {calls.filter(c => c.status === "missed").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "hsl(var(--hud-cyan) / 0.3)", borderTopColor: "hsl(var(--hud-cyan))" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Phone className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {filter === "missed" ? "No missed calls" : "No calls yet"}
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
              Start a call from any chat thread
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map(call => (
              <button
                key={call.id}
                onClick={() => haptic("light")}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[hsl(var(--hud-surface)/0.3)] transition-colors text-left"
              >
                {/* Call direction icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: call.status === "missed"
                      ? "hsl(0, 70%, 60%, 0.1)"
                      : "hsl(var(--hud-surface))",
                  }}
                >
                  {getCallIcon(call)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium truncate"
                      style={{
                        color: call.status === "missed" ? "hsl(0, 70%, 60%)" : "hsl(var(--hud-text))",
                      }}
                    >
                      {call.context_label || (call.caller_id === user?.id ? "Outgoing call" : "Incoming call")}
                    </span>
                    {call.is_video && <Video className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      {call.status === "ended" ? formatDuration(call.duration_seconds) : call.status}
                    </span>
                    <span className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                      {call.context_type !== "listing" ? call.context_type : ""}
                    </span>
                  </div>
                </div>

                {/* Time + redial */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                    {formatCallTime(call.created_at)}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "hsl(var(--hud-cyan) / 0.08)" }}
                  >
                    <Phone className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
