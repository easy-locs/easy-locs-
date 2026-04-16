/**
 * ExecutionTaskPanel — task #712
 *
 * Live view of `system.execution_tasks` for admins. Shows status badges,
 * execution timeline, structured logs (from result.logs), error details,
 * attempt count, blocked reason, and approver info. Auto-refreshes via
 * short polling (RLS already restricts SELECT to admins).
 *
 * Provides a Retry control on FAILED tasks — dispatching a new task with
 * the same payload, parent_task_id linkage, and a fresh attempt_count.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import {
  classifyTaskType,
  mediumRequiresApproval,
  taskDispatcher,
} from "@/core/execution";
import { db } from "@/services/db";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

type ExecRow = {
  id: string;
  type: string;
  domain: string;
  risk_level: "SAFE" | "MEDIUM" | "CRITICAL";
  // Phase-2 v2 status model (task #750).
  status:
    | "draft"
    | "pending_review"
    | "approved"
    | "rejected"
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "blocked"
    | "rolled_back"
    | "cancelled";
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  requested_by: string;
  parent_task_id: string | null;
  blocked_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  idempotency_key: string | null;
  attempt_count: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
};

const STATUSES = [
  "",
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "queued",
  "running",
  "succeeded",
  "failed",
  "blocked",
  "rolled_back",
  "cancelled",
] as const;
type StatusFilter = (typeof STATUSES)[number];

function StatusBadge({ status }: { status: ExecRow["status"] }) {
  const variant =
    status === "succeeded"
      ? "success"
      : status === "running"
        ? "info"
        : status === "queued" || status === "approved" || status === "pending_review" || status === "draft"
          ? "warning"
          : status === "blocked" || status === "failed" || status === "rejected" || status === "rolled_back" || status === "cancelled"
            ? "destructive"
            : "secondary";
  return <Badge variant={variant as never}>{status}</Badge>;
}

function RiskBadge({ risk }: { risk: ExecRow["risk_level"] }) {
  const variant =
    risk === "SAFE" ? "success" : risk === "MEDIUM" ? "warning" : "destructive";
  return <Badge variant={variant as never}>{risk}</Badge>;
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function relTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

/**
 * Pull a structured log array out of result. We accept either result.logs
 * (preferred — array of {ts, level, message}) or result.summary (a single
 * summary string written by logEngineRun helpers). Anything else is shown
 * as raw JSON so the operator never loses information.
 */
function extractLogs(result: Record<string, unknown> | null): Array<{
  ts?: string;
  level?: string;
  message: string;
}> {
  if (!result || typeof result !== "object") return [];
  const logs: Array<{ ts?: string; level?: string; message: string }> = [];

  const raw = (result as { logs?: unknown }).logs;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === "string") {
        logs.push({ message: entry });
      } else if (entry && typeof entry === "object") {
        const e = entry as { ts?: string; level?: string; message?: string };
        logs.push({
          ts: e.ts,
          level: e.level,
          message: e.message ?? JSON.stringify(entry),
        });
      }
    }
  }

  const summary = (result as { summary?: unknown }).summary;
  if (typeof summary === "string" && summary.trim().length > 0) {
    logs.unshift({ level: "summary", message: summary });
  }

  return logs;
}

function TaskRow({ row, onRetry, retrying }: {
  row: ExecRow;
  onRetry: (row: ExecRow, opts: { authorize: boolean }) => void;
  retrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const logs = useMemo(() => extractLogs(row.result), [row.result]);
  const canRetry = row.status === "failed";

  // Sensitive types require explicit re-authorization on retry — never an
  // implicit approval bypass. SAFE (and MEDIUM types not in the approval
  // policy) can retry directly.
  const retryRisk = classifyTaskType(row.type);
  const retryNeedsApproval =
    retryRisk === "CRITICAL" ||
    (retryRisk === "MEDIUM" && mediumRequiresApproval(row.type));

  return (
    <AppCard className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={row.status} />
              <RiskBadge risk={row.risk_level} />
              <span className="text-sm font-semibold text-foreground truncate">{row.type}</span>
              <span className="text-[0.625rem] text-muted-foreground">@ {row.domain}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[0.625rem] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {relTime(row.created_at)}
              </span>
              <span>by {row.requested_by}</span>
              <span>
                attempt {row.attempt_count}/{row.max_attempts}
              </span>
              {row.parent_task_id && (
                <span className="font-mono truncate max-w-[140px]" title={row.parent_task_id}>
                  parent: {row.parent_task_id.slice(0, 8)}…
                </span>
              )}
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          )}
        </button>

        {row.blocked_reason && (
          <div className="text-[0.6875rem] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-start gap-2">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="break-words">{row.blocked_reason}</span>
          </div>
        )}

        {row.error && (
          <div className="text-[0.6875rem] text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-start gap-2">
            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="break-words font-mono">{row.error}</span>
          </div>
        )}

        {expanded && (
          <div className="space-y-3 border-t border-border/40 pt-3">
            {/* Timeline */}
            <div>
              <div className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1.5">
                Timeline
              </div>
              <ol className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Created</span>
                  <span className="ml-auto tabular-nums text-foreground">{fmt(row.created_at)}</span>
                </li>
                {row.approved_at && (
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    <span className="text-muted-foreground">
                      Approved by {row.approved_by ?? "—"}
                    </span>
                    <span className="ml-auto tabular-nums text-foreground">{fmt(row.approved_at)}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Last update</span>
                  <span className="ml-auto tabular-nums text-foreground">{fmt(row.updated_at)}</span>
                </li>
              </ol>
            </div>

            {/* Logs */}
            <div>
              <div className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1.5">
                Execution logs
              </div>
              {logs.length === 0 ? (
                <p className="text-[0.625rem] text-muted-foreground italic">
                  No structured logs recorded yet.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {logs.map((l, i) => (
                    <div
                      key={i}
                      className="text-[0.6875rem] font-mono bg-muted/40 border border-border/40 rounded px-2 py-1 flex items-start gap-2"
                    >
                      {l.level && (
                        <span className="text-[0.5625rem] font-semibold uppercase shrink-0 text-muted-foreground">
                          {l.level}
                        </span>
                      )}
                      {l.ts && (
                        <span className="text-[0.5625rem] shrink-0 text-muted-foreground">
                          {new Date(l.ts).toLocaleTimeString()}
                        </span>
                      )}
                      <span className="break-words text-foreground">{l.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Result JSON */}
            {row.result && Object.keys(row.result).length > 0 && (
              <div>
                <div className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Result payload
                </div>
                <pre className="text-[0.625rem] bg-muted/40 border border-border/40 rounded-lg p-2 overflow-x-auto max-h-48 text-foreground">
                  {JSON.stringify(row.result, null, 2)}
                </pre>
              </div>
            )}

            {/* Original payload */}
            {row.payload && Object.keys(row.payload).length > 0 && (
              <div>
                <div className="text-[0.625rem] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Request payload
                </div>
                <pre className="text-[0.625rem] bg-muted/40 border border-border/40 rounded-lg p-2 overflow-x-auto max-h-48 text-muted-foreground">
                  {JSON.stringify(row.payload, null, 2)}
                </pre>
              </div>
            )}

            {row.idempotency_key && (
              <div className="text-[0.625rem] text-muted-foreground font-mono break-all">
                idempotency: {row.idempotency_key}
              </div>
            )}
          </div>
        )}

        {canRetry && !authPromptOpen && (
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (retryNeedsApproval) {
                  setAuthChecked(false);
                  setAuthPromptOpen(true);
                } else {
                  onRetry(row, { authorize: false });
                }
              }}
              disabled={retrying}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        )}

        {canRetry && authPromptOpen && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 space-y-2">
            <div className="flex items-start gap-2 text-[0.6875rem] text-foreground">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
              <span>
                This is an{" "}
                <span className="font-semibold uppercase">{retryRisk}</span> task type.
                Re-authorization is required for every retry — prior approval is not carried over.
              </span>
            </div>
            <label className="flex items-start gap-2 text-[0.6875rem] cursor-pointer">
              <input
                type="checkbox"
                checked={authChecked}
                onChange={(e) => setAuthChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I authorize re-running this {retryRisk.toLowerCase()} task. My identity will be
                recorded as the new approver.
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAuthPromptOpen(false);
                  setAuthChecked(false);
                }}
                disabled={retrying}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRetry(row, { authorize: true });
                  setAuthPromptOpen(false);
                  setAuthChecked(false);
                }}
                disabled={!authChecked || retrying}
                className="gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
                Authorize & Retry
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </AppCard>
  );
}

export function ExecutionTaskPanel() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const queryClient = useQueryClient();

  const {
    data: tasks,
    isLoading,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ["exec-task-panel", statusFilter],
    queryFn: () =>
      dashboardRepo.fetchExecutionTasksFull({
        status: statusFilter || undefined,
        limit: 50,
      }) as Promise<ExecRow[]>,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const retryMut = useMutation({
    mutationFn: async ({ row, authorize }: { row: ExecRow; authorize: boolean }) => {
      // The retry creates a new task linked via parent_task_id with a fresh
      // attempt_count (the dispatcher inserts attempt_count=0 on every new
      // row). Approval is NEVER carried over from the parent — it is only
      // recorded when the operator explicitly authorizes the retry through
      // the inline auth prompt. Without that explicit consent, sensitive
      // retries land in BLOCKED with a clear reason and require a manual
      // approval before running.
      const { data: { user } } = await db.auth.getUser();
      const requester = user?.email || user?.id || "command-control-dashboard";
      return taskDispatcher.dispatch({
        type: row.type,
        domain: row.domain,
        payload: row.payload ?? {},
        requestedBy: requester,
        approvedBy: authorize ? requester : undefined,
        parentTaskId: row.id,
        idempotencyKey: `retry:${row.id}:${Date.now()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exec-task-panel"] });
    },
  });

  return (
    <div className="space-y-3">
      <AppCard>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            {STATUSES.map((s) => (
              <button
                key={s || "all"}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded-lg text-[0.625rem] font-medium ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s || "All"}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto gap-1.5"
              onClick={() => refetch()}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <p className="text-[0.625rem] text-muted-foreground">
            Live · auto-refresh every 5s · last update{" "}
            {dataUpdatedAt ? relTime(new Date(dataUpdatedAt).toISOString()) : "—"}
          </p>
        </CardContent>
      </AppCard>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{(error as Error).message}</span>
        </div>
      )}

      {retryMut.isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Retry failed: {(retryMut.error as Error).message}
        </div>
      )}

      {isLoading && !tasks && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!tasks || tasks.length === 0) && (
        <AppCard>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No execution tasks match the current filters.
          </CardContent>
        </AppCard>
      )}

      {tasks?.map((row) => (
        <TaskRow
          key={row.id}
          row={row}
          onRetry={(r, opts) => retryMut.mutate({ row: r, authorize: opts.authorize })}
          retrying={retryMut.isPending && retryMut.variables?.row.id === row.id}
        />
      ))}

      <p className="text-[0.625rem] text-muted-foreground text-center pt-2">
        CRITICAL tasks require explicit authorization before they can leave the queued state.
        RLS restricts visibility to administrators only.
      </p>
    </div>
  );
}

export default ExecutionTaskPanel;
