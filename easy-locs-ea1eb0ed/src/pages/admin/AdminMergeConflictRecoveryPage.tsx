/**
 * AdminMergeConflictRecoveryPage — Operator dashboard for the LC4
 * dev-builder merge-conflict recovery loop (task #940).
 *
 * Surfaces the `merge_conflict_recovery` audit envelopes that the
 * recovery handler stamps onto `system.execution_tasks.payload`:
 *   - Per-day counts for the last 14 days.
 *   - Top 5 most-conflicting file paths.
 *   - Recent events with timestamp, builder task id, overlap count,
 *     and a deep link into the builder task row.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, RefreshCw, ExternalLink, GitMerge, X } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import {
  fetchMergeConflictRecoveryEvents,
  projectMergeConflictRecoverySummary,
} from "@/repositories/merge-conflict-recovery.repository";

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return DAY_LABEL_FORMATTER.format(d);
}

export default function AdminMergeConflictRecoveryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTaskId = searchParams.get("taskId");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(urlTaskId);
  useEffect(() => {
    setSelectedTaskId(urlTaskId);
  }, [urlTaskId]);
  function openTask(taskId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("taskId", taskId);
    setSearchParams(next, { replace: false });
  }
  function closeDrawer() {
    const next = new URLSearchParams(searchParams);
    next.delete("taskId");
    setSearchParams(next, { replace: true });
    setSelectedTaskId(null);
  }
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-merge-conflict-recovery"],
    queryFn: fetchMergeConflictRecoveryEvents,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const summary = useMemo(
    () => projectMergeConflictRecoverySummary(data ?? []),
    [data],
  );

  const peakDay = useMemo(() => {
    let max = 0;
    for (const d of summary.perDay) if (d.count > max) max = d.count;
    return max;
  }, [summary.perDay]);

  return (
    <SubPageShell
      title="Merge-Conflict Recovery"
      subtitle="Dev-builder auto-replan events from hard drift overlaps (last 14 days)"
      onBack={() => navigate("/admin/system-health")}
    >
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm font-semibold mb-1">Failed to load recovery events</p>
            <p className="text-xs text-muted-foreground mb-4">
              {(error as Error).message}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Metric title="Events (14d)" value={summary.totalEvents.toString()} />
              <Metric title="Affected builder tasks" value={summary.affectedTasks.toString()} />
              <Metric title="Peak day" value={peakDay.toString()} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-muted-foreground" />
                  Recovery events per day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {summary.perDay.map((d) => {
                    const pct = peakDay === 0 ? 0 : (d.count / peakDay) * 100;
                    return (
                      <div
                        key={d.day}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`${d.day}: ${d.count}`}
                      >
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t bg-primary/70"
                            style={{ height: `${pct}%`, minHeight: d.count > 0 ? "4px" : "0" }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {d.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{formatDay(summary.perDay[0]?.day ?? "")}</span>
                  <span>{formatDay(summary.perDay[summary.perDay.length - 1]?.day ?? "")}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top conflicting file paths</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.topFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No conflicting file paths recorded in the last 14 days.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {summary.topFiles.map((f) => (
                      <li
                        key={f.file}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <code className="font-mono text-xs truncate">{f.file}</code>
                        <Badge variant="secondary">{f.count}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Recent events ({summary.events.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summary.events.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-muted-foreground text-center">
                    No merge-conflict recovery events in the last 14 days.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {summary.events.slice(0, 50).map((e, i) => (
                      <li
                        key={`${e.task_id}:${e.at}:${i}`}
                        className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground tabular-nums">
                              {new Date(e.at).toLocaleString()}
                            </span>
                            <Badge
                              variant={e.severity === "hard" ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {e.severity}
                            </Badge>
                            <span className="text-muted-foreground">
                              {e.overlaps} overlap{e.overlaps === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">task</span>
                            <code className="font-mono truncate">
                              {e.builder_task_id}
                            </code>
                          </div>
                          {e.files.length > 0 && (
                            <div className="mt-1 text-[11px] text-muted-foreground truncate">
                              {e.files.slice(0, 3).join(", ")}
                              {e.files.length > 3 ? ` +${e.files.length - 3} more` : ""}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 shrink-0"
                          onClick={() => openTask(e.builder_task_id)}
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            {selectedTaskId && (
              <BuilderTaskDrawer
                taskId={selectedTaskId}
                onClose={closeDrawer}
                onOpenInCommandControl={() => {
                  navigate(
                    `/admin/command-control?tab=live-tasks&taskId=${encodeURIComponent(selectedTaskId)}`,
                  );
                }}
              />
            )}
          </>
        )}
      </div>
    </SubPageShell>
  );
}

function BuilderTaskDrawer({
  taskId,
  onClose,
  onOpenInCommandControl,
}: {
  taskId: string;
  onClose: () => void;
  onOpenInCommandControl: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-merge-conflict-recovery-task", taskId],
    queryFn: () => dashboardRepo.fetchExecutionTaskById(taskId),
    staleTime: 15_000,
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-card">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Builder task
            </p>
            <code className="font-mono text-xs truncate block">{taskId}</code>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{(error as Error).message}</span>
            </div>
          )}
          {!isLoading && !error && !data && (
            <p className="text-sm text-muted-foreground">
              Task not found. It may have been purged or you may not have
              permission to view it.
            </p>
          )}
          {!isLoading && !error && data && (
            <BuilderTaskDetails row={data as BuilderTaskRow} />
          )}
          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={onOpenInCommandControl}
            >
              Open in Command & Control <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BuilderTaskRow {
  id: string;
  type: string;
  domain: string | null;
  status: string;
  risk_level: string | null;
  blocked_reason: string | null;
  attempt_count: number | null;
  max_attempts: number | null;
  agent_id: string | null;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
  payload: Record<string, unknown> | null;
}

function BuilderTaskDetails({ row }: { row: BuilderTaskRow }) {
  const recovery = Array.isArray(
    (row.payload as { merge_conflict_recovery?: unknown[] } | null)
      ?.merge_conflict_recovery,
  )
    ? ((row.payload as { merge_conflict_recovery: unknown[] }).merge_conflict_recovery as Array<
        Record<string, unknown>
      >)
    : [];
  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="status" value={row.status} />
        <Stat label="type" value={row.type} />
        {row.domain ? <Stat label="domain" value={row.domain} /> : null}
        {row.risk_level ? <Stat label="risk" value={row.risk_level} /> : null}
        <Stat
          label="attempts"
          value={`${row.attempt_count ?? 0}/${row.max_attempts ?? "∞"}`}
        />
        <Stat label="created" value={new Date(row.created_at).toLocaleString()} />
        <Stat label="updated" value={new Date(row.updated_at).toLocaleString()} />
      </div>
      {row.blocked_reason && (
        <div className="rounded border border-warning/40 bg-warning/5 p-3 text-xs">
          <span className="text-[10px] uppercase text-muted-foreground mr-2">
            Blocked
          </span>
          <code className="font-mono">{row.blocked_reason}</code>
        </div>
      )}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Recovery history ({recovery.length})
        </div>
        {recovery.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No history.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {recovery.map((entry, i) => (
              <li
                key={i}
                className="rounded border border-border/40 bg-muted/20 p-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">
                    {typeof entry.at === "string"
                      ? new Date(entry.at).toLocaleString()
                      : "—"}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {String(entry.severity ?? "?")}
                  </Badge>
                  <span className="text-muted-foreground">
                    {String(entry.overlaps ?? 0)} overlaps
                  </span>
                </div>
                {Array.isArray(entry.files) && entry.files.length > 0 && (
                  <div className="mt-1 text-[11px] text-muted-foreground truncate">
                    {(entry.files as string[]).join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono truncate">{value}</div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4">
      <p className="text-[0.6875rem] text-muted-foreground font-medium uppercase tracking-wider">
        {title}
      </p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
