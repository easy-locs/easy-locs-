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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle, RefreshCw, ExternalLink, GitMerge, X, Siren, Bell } from "lucide-react";
import { toast } from "sonner";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import {
  fetchMergeConflictRecoveryAlertLog,
  fetchMergeConflictRecoveryEvents,
  loadMergeConflictAlertThreshold,
  type MergeConflictRecoveryAlertLogEntry,
  MAX_THRESHOLD_WINDOW_MINUTES,
  type MergeConflictAlertThreshold,
  MIN_THRESHOLD_COUNT,
  MIN_THRESHOLD_WINDOW_MINUTES,
  projectMergeConflictRecoverySummary,
  saveMergeConflictAlertThreshold,
  summarizeFileBurstsWithinWindow,
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

  const alertLogQuery = useQuery({
    queryKey: ["admin-merge-conflict-recovery-alert-log"],
    queryFn: () => fetchMergeConflictRecoveryAlertLog(20),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const queryClient = useQueryClient();
  const thresholdQuery = useQuery({
    queryKey: ["admin-merge-conflict-recovery-threshold"],
    queryFn: loadMergeConflictAlertThreshold,
    staleTime: 30_000,
  });
  const thresholdMutation = useMutation({
    mutationFn: saveMergeConflictAlertThreshold,
    onSuccess: (saved) => {
      queryClient.setQueryData(
        ["admin-merge-conflict-recovery-threshold"],
        saved,
      );
      toast.success("Spike-detection threshold saved");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save threshold: ${msg}`);
    },
  });
  const threshold: MergeConflictAlertThreshold | undefined = thresholdQuery.data;

  const fileBursts = useMemo(() => {
    if (!threshold) return [];
    return summarizeFileBurstsWithinWindow(
      data ?? [],
      threshold.windowMinutes * 60 * 1000,
    ).slice(0, 10);
  }, [data, threshold]);

  const alertingFiles = useMemo(() => {
    if (!threshold) return [];
    return fileBursts.filter((f) => f.count >= threshold.count);
  }, [fileBursts, threshold]);

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

            <SpikeDetectionCard
              thresholdQuery={thresholdQuery}
              onSave={(t) => thresholdMutation.mutate(t)}
              isSaving={thresholdMutation.isPending}
              bursts={fileBursts}
              alertingFiles={alertingFiles}
            />

            <RecentAlertLogCard
              isLoading={alertLogQuery.isLoading}
              isFetching={alertLogQuery.isFetching}
              error={alertLogQuery.error}
              entries={alertLogQuery.data ?? []}
              onRefresh={() => alertLogQuery.refetch()}
            />

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

interface SpikeDetectionCardProps {
  thresholdQuery: {
    data: MergeConflictAlertThreshold | undefined;
    isLoading: boolean;
    error: unknown;
    refetch: () => void;
  };
  onSave: (next: MergeConflictAlertThreshold) => void;
  isSaving: boolean;
  bursts: ReadonlyArray<{ file: string; count: number; lastAt: string }>;
  alertingFiles: ReadonlyArray<{ file: string; count: number; lastAt: string }>;
}

function SpikeDetectionCard({
  thresholdQuery,
  onSave,
  isSaving,
  bursts,
  alertingFiles,
}: SpikeDetectionCardProps) {
  const threshold = thresholdQuery.data;
  const [draft, setDraft] = useState<MergeConflictAlertThreshold | null>(null);
  useEffect(() => {
    if (threshold) setDraft(threshold);
  }, [threshold]);

  if (thresholdQuery.isLoading || !threshold || !draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Siren className="h-4 w-4 text-muted-foreground" />
            Spike detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (thresholdQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Siren className="h-4 w-4 text-destructive" />
            Spike detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Failed to load shared threshold:{" "}
              {(thresholdQuery.error as Error).message}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dirty =
    draft.count !== threshold.count ||
    draft.windowMinutes !== threshold.windowMinutes;
  const topCount = bursts[0]?.count ?? 0;
  const proximityPct = Math.min(
    100,
    Math.round((topCount / Math.max(1, threshold.count)) * 100),
  );
  const proximityTone =
    topCount >= threshold.count
      ? "bg-destructive"
      : topCount >= threshold.count * 0.75
        ? "bg-warning"
        : "bg-primary/70";
  return (
    <Card className={alertingFiles.length > 0 ? "border-destructive/50" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Siren
            className={`h-4 w-4 ${alertingFiles.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
          />
          Spike detection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="mcr-threshold-count" className="text-xs">
              Alert when a single file path crosses
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="mcr-threshold-count"
                type="number"
                inputMode="numeric"
                min={MIN_THRESHOLD_COUNT}
                value={draft.count}
                onChange={(e) => {
                  const next = Math.max(
                    MIN_THRESHOLD_COUNT,
                    Math.floor(Number(e.target.value) || MIN_THRESHOLD_COUNT),
                  );
                  setDraft({ ...draft, count: next });
                }}
                className="h-8 w-24"
              />
              <span className="text-xs text-muted-foreground">conflicts</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="mcr-threshold-window" className="text-xs">
              Within rolling window
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="mcr-threshold-window"
                type="number"
                inputMode="numeric"
                min={MIN_THRESHOLD_WINDOW_MINUTES}
                max={MAX_THRESHOLD_WINDOW_MINUTES}
                value={draft.windowMinutes}
                onChange={(e) => {
                  const raw = Math.floor(
                    Number(e.target.value) || MIN_THRESHOLD_WINDOW_MINUTES,
                  );
                  const next = Math.min(
                    MAX_THRESHOLD_WINDOW_MINUTES,
                    Math.max(MIN_THRESHOLD_WINDOW_MINUTES, raw),
                  );
                  setDraft({ ...draft, windowMinutes: next });
                }}
                className="h-8 w-24"
              />
              <span className="text-xs text-muted-foreground">minutes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Shared across all operators. Server-side audit handler reads
            this and pages on-call automatically when crossed.
          </p>
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || isSaving}
            onClick={() => onSave(draft)}
            className="gap-2 shrink-0"
          >
            {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              Worst file proximity to threshold
            </span>
            <span className="tabular-nums font-medium">
              {topCount} / {threshold.count}
            </span>
          </div>
          <div className="h-2 w-full rounded bg-muted overflow-hidden">
            <div
              className={`h-full ${proximityTone} transition-all`}
              style={{ width: `${proximityPct}%` }}
            />
          </div>
        </div>

        {bursts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No file conflicts in the last {threshold.windowMinutes} minute
            {threshold.windowMinutes === 1 ? "" : "s"}.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {bursts.map((b) => {
              const tripped = b.count >= threshold.count;
              const pct = Math.min(
                100,
                Math.round((b.count / Math.max(1, threshold.count)) * 100),
              );
              return (
                <li key={b.file} className="text-xs">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <code className="font-mono truncate">{b.file}</code>
                    <Badge
                      variant={tripped ? "destructive" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {b.count} / {threshold.count}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full ${tripped ? "bg-destructive" : "bg-primary/60"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {alertingFiles.length > 0 && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
            <span>
              {alertingFiles.length} file
              {alertingFiles.length === 1 ? " is" : "s are"} over the threshold.
              The server-side audit handler pages ops in the Alert Center
              (rate-limited to once per hour per file).
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// NOTE (#952): the dashboard-driven alert hook was removed in favour
// of server-side spike detection inside
// `supabase/functions/_shared/execution/builders/merge-conflict-storm-alerts.ts`.
// The dashboard only renders threshold + proximity now, which means ops
// gets paged whether or not anyone has this page open.

interface RecentAlertLogCardProps {
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  entries: ReadonlyArray<MergeConflictRecoveryAlertLogEntry>;
  onRefresh: () => void;
}

const ALERT_TYPE_PREFIX = "merge_conflict_recovery.";

function formatAlertKind(alertType: string): string {
  const tail = alertType.startsWith(ALERT_TYPE_PREFIX)
    ? alertType.slice(ALERT_TYPE_PREFIX.length)
    : alertType;
  return tail.replace(/_/g, " ");
}

function statusBadgeVariant(
  status: string,
): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "sent":
      return "default";
    case "throttled":
      return "secondary";
    case "flood_suppressed":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

function severityBadgeVariant(
  severity: string,
): "default" | "destructive" | "secondary" | "outline" {
  switch (severity) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "secondary";
  }
}

function RecentAlertLogCard({
  isLoading,
  isFetching,
  error,
  entries,
  onRefresh,
}: RecentAlertLogCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Recent merge-conflict alerts ({entries.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-6 py-6 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Failed to load alert log: {(error as Error).message}
            </span>
          </div>
        ) : entries.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground text-center">
            No merge-conflict alerts have fired recently.
          </p>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="text-muted-foreground tabular-nums">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    <Badge
                      variant={severityBadgeVariant(entry.severity)}
                      className="text-[10px]"
                    >
                      {entry.severity}
                    </Badge>
                    <Badge
                      variant={statusBadgeVariant(entry.status)}
                      className="text-[10px]"
                    >
                      {entry.status}
                    </Badge>
                    <span className="text-muted-foreground capitalize">
                      {formatAlertKind(entry.alertType)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">
                    {entry.title}
                  </p>
                  {entry.message && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {entry.message}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
