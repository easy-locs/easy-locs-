/**
 * CallDebugOverlay — Visible debug panel for call signaling diagnostics.
 */
import { useEffect, useState } from "react";
import { useCall } from "@/components/call/CallProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DebugEntry {
  ts: string;
  label: string;
  value: string;
}

export function CallDebugOverlay() {
  const { user } = useAuth();
  const { isInCall, isStartingCall } = useCall();
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState("not subscribed");
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string>("none");
  const [micPermission, setMicPermission] = useState("unknown");
  const [callLogsCount, setCallLogsCount] = useState<number | null>(null);

  // Check microphone permission
  useEffect(() => {
    if (!navigator.permissions?.query) {
      setMicPermission("API unavailable");
      return;
    }
    navigator.permissions.query({ name: "microphone" as PermissionName })
      .then((r) => {
        setMicPermission(r.state);
        r.onchange = () => setMicPermission(r.state);
      })
      .catch(() => setMicPermission("query failed"));
  }, []);

  // Check recent call_logs for this user
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .or(`caller_orbit_id.eq.${user.id},receiver_orbit_id.eq.${user.id}`)
      .then(({ count }) => setCallLogsCount(count ?? 0));
  }, [user?.id, isInCall]);

  // Subscribe to call_logs realtime for debug
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("call-debug-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, (payload) => {
        const call = payload.new as any;
        const ts = new Date().toISOString().slice(11, 19);
        setLastRealtimeEvent(`${payload.eventType}: ${call?.status || "?"} @ ${ts}`);
        setEntries((prev) => [
          { ts, label: `RT:${payload.eventType}`, value: `status=${call?.status} id=${(call?.id || "").slice(0, 8)}` },
          ...prev.slice(0, 19),
        ]);
        // Refresh count
        supabase
          .from("call_logs")
          .select("id", { count: "exact", head: true })
          .or(`caller_orbit_id.eq.${user.id},receiver_orbit_id.eq.${user.id}`)
          .then(({ count }) => setCallLogsCount(count ?? 0));
      })
      .subscribe((status) => setRealtimeStatus(status));

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Listen for startCall console logs via global interceptor
  useEffect(() => {
    const origLog = console.log;
    const origErr = console.error;
    const intercept = (label: string) => (...args: any[]) => {
      const msg = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      if (msg.includes("[CallProvider]") || msg.includes("call")) {
        const ts = new Date().toISOString().slice(11, 19);
        setEntries((prev) => [{ ts, label, value: msg.slice(0, 120) }, ...prev.slice(0, 19)]);
      }
    };
    const logIntercept = intercept("LOG");
    const errIntercept = intercept("ERR");
    console.log = (...args: any[]) => { logIntercept(...args); origLog(...args); };
    console.error = (...args: any[]) => { errIntercept(...args); origErr(...args); };
    return () => { console.log = origLog; console.error = origErr; };
  }, []);

  return (
    <details className="fixed top-16 right-2 z-[999] max-w-[280px] rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-lg text-[10px]">
      <summary className="cursor-pointer px-3 py-1.5 font-semibold text-muted-foreground">
        📞 Call debug
      </summary>
      <div className="px-3 pb-2 space-y-0.5 text-foreground leading-relaxed max-h-[300px] overflow-y-auto">
        <p><span className="text-muted-foreground">userId:</span> <b>{user?.id?.slice(0, 8) || "none"}…</b></p>
        <p><span className="text-muted-foreground">isInCall:</span> <b>{String(isInCall)}</b></p>
        <p><span className="text-muted-foreground">isStartingCall:</span> <b>{String(isStartingCall)}</b></p>
        <p><span className="text-muted-foreground">micPermission:</span> <b>{micPermission}</b></p>
        <p><span className="text-muted-foreground">realtimeStatus:</span> <b>{realtimeStatus}</b></p>
        <p><span className="text-muted-foreground">lastRealtimeEvent:</span> <b className="break-all">{lastRealtimeEvent}</b></p>
        <p><span className="text-muted-foreground">callLogsCount:</span> <b>{callLogsCount ?? "…"}</b></p>
        <hr className="border-border/30 my-1" />
        <p className="font-semibold text-muted-foreground">Event log:</p>
        {entries.length === 0 && <p className="text-muted-foreground">No events yet — tap a call button to test</p>}
        {entries.map((e, i) => (
          <p key={i} className="break-all">
            <span className="text-muted-foreground">{e.ts}</span> <b>{e.label}</b> {e.value}
          </p>
        ))}
      </div>
    </details>
  );
}
