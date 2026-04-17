/**
 * EventStream — ACP Agent 5 (#864). Live feed of recent runs and engine
 * activity. Items merged from `engine_run_logs` and recent
 * `execution_tasks`, sorted newest-first by event timestamp.
 */
import { useNavigate } from "react-router-dom";
import { Activity, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { EventStreamItem } from "@/services/domain/control-overview.service";

interface Props {
  events: EventStreamItem[];
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function statusIcon(status: string) {
  const s = status.toLowerCase();
  if (s === "succeeded" || s === "ok" || s === "completed") {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  }
  if (s === "failed" || s === "error") {
    return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  }
  if (s === "warning" || s === "degraded") {
    return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
  }
  if (s === "running" || s === "pending" || s === "pending_review" || s === "in_progress") {
    return <Clock className="w-3.5 h-3.5 text-sky-400" />;
  }
  return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function EventStream({ events }: Props) {
  const navigate = useNavigate();

  if (events.length === 0) {
    return (
      <div
        className="rounded-xl border border-border/40 bg-card p-4 text-xs text-muted-foreground"
        data-testid="control-overview-stream"
      >
        No recent activity in the last hour.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border/40 bg-card overflow-hidden"
      data-testid="control-overview-stream"
    >
      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live events
        </h3>
        <span className="text-[0.625rem] text-muted-foreground">{events.length}</span>
      </div>
      <ul className="divide-y divide-border/30 max-h-[420px] overflow-y-auto">
        {events.map((evt) => (
          <li key={evt.id}>
            <button
              type="button"
              onClick={() => {
                if (evt.source === "task") {
                  navigate(`/admin/control/runs?id=${encodeURIComponent(evt.id.replace(/^task:/, ""))}`);
                } else {
                  navigate(`/admin/control/engines?engine=${encodeURIComponent(evt.category)}`);
                }
              }}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
              data-testid={`control-overview-stream-item-${evt.id}`}
            >
              <span className="mt-0.5">{statusIcon(evt.status)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground truncate">
                    {evt.title}
                  </span>
                  <span className="text-[0.625rem] uppercase text-muted-foreground/80 shrink-0">
                    {evt.source}
                  </span>
                </div>
                {evt.detail && (
                  <p className="text-[0.625rem] text-muted-foreground truncate mt-0.5">
                    {evt.detail}
                  </p>
                )}
              </div>
              <span className="text-[0.625rem] text-muted-foreground tabular-nums shrink-0">
                {relTime(evt.ts)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
