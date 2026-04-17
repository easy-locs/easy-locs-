/**
 * AgentLiveLogs — live tail of canonical events for a single agent.
 *
 * Strategy:
 *   1. Initial fetch — last 50 rows from `engine_run_logs` filtered by
 *      `metadata_json->>agent_id`, newest first.
 *   2. Subscribe to a Supabase realtime channel on the same table; for
 *      every INSERT whose `metadata_json.agent_id` matches, prepend the
 *      row to the in-memory buffer (capped at 200 to keep the DOM tiny).
 *   3. Auto-scroll is on by default; the operator can pause it (e.g. to
 *      copy a stack trace) — new rows still arrive, just don't snap.
 *
 * Channel naming: `agent-logs:<agentId>` — one channel per drawer
 * instance keeps cleanup straightforward and avoids global fan-out.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, AlertTriangle, Loader2 } from "lucide-react";
import { db } from "@/services/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogRow {
  id: string;
  category: string;
  status: string;
  message: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

const MAX_BUFFER = 200;

interface Props {
  agentId: string;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AgentLiveLogs({ agentId }: Props) {
  const initial = useQuery({
    queryKey: ["admin-agents", "live-logs", agentId],
    queryFn: async () => {
      const { data, error } = await db
        .from("engine_run_logs")
        .select("id, category, status, message, metadata_json, created_at")
        .filter("metadata_json->>agent_id", "eq", agentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as LogRow[];
    },
    staleTime: 0,
  });

  const [buffer, setBuffer] = useState<LogRow[]>([]);
  const [paused, setPaused] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [tailing, setTailing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial.data) setBuffer(initial.data);
  }, [initial.data]);

  useEffect(() => {
    setStreamError(null);
    setTailing(false);
    const channel = db
      .channel(`agent-logs:${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "engine_run_logs",
        },
        (payload) => {
          const row = payload.new as LogRow;
          const md = (row.metadata_json ?? {}) as Record<string, unknown>;
          if (md.agent_id !== agentId) return;
          setBuffer((prev) => {
            const next = [row, ...prev];
            return next.length > MAX_BUFFER ? next.slice(0, MAX_BUFFER) : next;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setTailing(true);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setTailing(false);
          setStreamError("Realtime channel error — retrying…");
        }
      });
    return () => {
      void db.removeChannel(channel);
    };
  }, [agentId]);

  useEffect(() => {
    if (paused) return;
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [buffer, paused]);

  const liveBadge = useMemo(() => {
    if (streamError)
      return (
        <Badge variant="destructive" className="text-[0.5625rem] gap-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          OFFLINE
        </Badge>
      );
    if (tailing)
      return (
        <Badge className="text-[0.5625rem] gap-1 bg-success text-success-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          LIVE
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-[0.5625rem] gap-1">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        CONNECTING
      </Badge>
    );
  }, [tailing, streamError]);

  return (
    <div className="space-y-2" data-testid="agent-live-logs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {liveBadge}
          <span className="text-[0.625rem] text-muted-foreground tabular-nums">
            {buffer.length} event{buffer.length === 1 ? "" : "s"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-[0.6875rem]"
          onClick={() => setPaused((p) => !p)}
          data-testid="agent-live-logs-toggle"
          aria-pressed={paused}
        >
          {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {paused ? "Resume scroll" : "Pause scroll"}
        </Button>
      </div>

      {initial.error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          {(initial.error as Error).message}
        </div>
      )}

      <div
        ref={containerRef}
        className="rounded-lg border border-border/40 bg-muted/20 max-h-[420px] overflow-y-auto font-mono text-[0.6875rem]"
      >
        {initial.isLoading && buffer.length === 0 ? (
          <div className="py-6 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : buffer.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground italic">
            No events yet. Waiting for live activity…
          </p>
        ) : (
          <ul className="divide-y divide-border/30">
            {buffer.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "px-2.5 py-1.5 flex gap-2 items-start hover:bg-muted/40",
                  row.status !== "ok" && "bg-destructive/5",
                )}
                data-testid={`agent-live-log-${row.id}`}
              >
                <span className="text-muted-foreground tabular-nums shrink-0 w-16">
                  {fmtTime(row.created_at)}
                </span>
                <span
                  className={cn(
                    "shrink-0 uppercase tracking-wider text-[0.5625rem] font-bold w-12",
                    row.status === "ok"
                      ? "text-success"
                      : row.status === "warn"
                        ? "text-warning"
                        : "text-destructive",
                  )}
                >
                  {row.status}
                </span>
                <span className="text-foreground/80 shrink-0 w-24 truncate">
                  {row.category}
                </span>
                <span className="text-foreground break-words flex-1 min-w-0">
                  {row.message ?? <span className="text-muted-foreground italic">no message</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
