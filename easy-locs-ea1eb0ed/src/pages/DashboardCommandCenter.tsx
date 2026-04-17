/**
 * Dashboard · Command Center
 *
 * Track 3 (#843): mutations are now ALWAYS expressed as an execution-task
 * dispatch (`trigger-github` Edge Function → `system.dispatch_execution_task`).
 * This page no longer writes to `public.agent_tasks`. It reads its task list
 * directly from `system.execution_tasks` (admin RLS already in place; the
 * companion migration `20260428000000_command_center_execution_tasks.sql`
 * adds a per-requester read policy + realtime publication entry so this
 * page can subscribe to live status updates).
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Terminal, Play, Clock, CheckCircle2, XCircle, Loader2,
  ExternalLink, Copy, ChevronRight, Zap, GitBranch, AlertCircle,
  RefreshCw, GitCommit, Timer, CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  COMMAND_CENTER_TASK_COLUMNS,
  dispatchCommandCenterPrompt,
} from "@/lib/execution/dispatchCommandCenter";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Execution-task row (system.execution_tasks) — only the columns this
// page actually reads. Avoids leaking the entire wide row type.
//
// Both writer paths now agree on the V2 columns:
//   • Orchestrator V2 (LB1) writes `execution_result` + `error_code`.
//   • The GitHub runner callback (`execution-runner-callback`) was
//     migrated to the same V2 shape (task #848); the legacy
//     `result` / `error` columns from the agent_tasks era are no
//     longer written, and a backfill migration copied any old
//     in-flight rows forward, so the projection only has to read
//     the canonical columns.
export interface ExecutionTaskRow {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown> | null;
  execution_result: Record<string, unknown> | null;
  external_run_url: string | null;
  blocked_reason: string | null;
  error_code: string | null;
  requested_by: string;
  created_at: string;
  updated_at: string;
}

type TaskStatus = "queued" | "running" | "success" | "error";

/** Map system.execution_tasks status → 4-zone UI status. */
export function uiStatus(raw: string): TaskStatus {
  switch (raw) {
    case "draft":
    case "queued":
    case "approved":
      return "queued";
    case "running":
    case "pending_review":
    case "rolling_back":
      return "running";
    case "succeeded":
    case "rolled_back":
      return "success";
    default:
      // failed | blocked | rejected | cancelled | rollback_failed | …
      return "error";
  }
}

const STATUS_META: Record<TaskStatus, {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}> = {
  queued:  { label: "Queued",  Icon: Clock,        color: "text-amber-400",   bg: "bg-amber-400/10" },
  running: { label: "Running", Icon: Loader2,      color: "text-blue-400",    bg: "bg-blue-400/10"  },
  success: { label: "Success", Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10"},
  error:   { label: "Error",   Icon: XCircle,      color: "text-red-400",     bg: "bg-red-400/10"   },
};

function StatusBadge({ status }: { status: string }) {
  const s = uiStatus(status);
  const { label, Icon, color, bg } = STATUS_META[s];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color} ${bg}`}>
      <Icon className={`w-3 h-3 ${s === "running" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function ConclusionBadge({ conclusion }: { conclusion: string | null }) {
  if (!conclusion) return null;
  const map: Record<string, { label: string; color: string }> = {
    success:   { label: "✓ success",   color: "text-emerald-400" },
    failure:   { label: "✗ failure",   color: "text-red-400" },
    cancelled: { label: "⊘ cancelled", color: "text-amber-400" },
    skipped:   { label: "— skipped",   color: "text-muted-foreground" },
    timed_out: { label: "⏱ timed out", color: "text-orange-400" },
    action_required: { label: "⚠ action required", color: "text-amber-400" },
    startup_failure: { label: "✗ startup failure", color: "text-red-400" },
    stale: { label: "◌ stale", color: "text-muted-foreground" },
  };
  const m = map[conclusion] ?? { label: conclusion, color: "text-muted-foreground" };
  return <span className={`text-xs font-mono font-semibold ${m.color}`}>{m.label}</span>;
}

// ── Projection helpers — surface execution_tasks payload/result fields in
// a stable shape so the JSX below doesn't have to introspect the JSONB.
interface TaskView {
  id: string;
  prompt: string;
  status: string;
  github_run_url: string | null;
  github_run_id: string | null;
  github_workflow_name: string | null;
  github_branch: string | null;
  github_conclusion: string | null;
  logs: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function projectTask(row: ExecutionTaskRow): TaskView {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  // Single canonical source: the V2 `execution_result` column. Both
  // writer paths (orchestrator V2 and the GitHub runner callback) write
  // here (task #848); the legacy `result` / `error` columns are no
  // longer read.
  const v2 = (row.execution_result ?? {}) as Record<string, unknown>;
  const output = (v2.output ?? {}) as Record<string, unknown>;

  // Run-id parsed from external_run_url tail when present
  // (e.g. https://github.com/owner/repo/actions/runs/1234567 → 1234567).
  const runUrl = row.external_run_url ?? asString(output.external_run_url);
  let runId: string | null = null;
  if (runUrl) {
    const m = runUrl.match(/\/runs\/(\d+)/);
    if (m) runId = m[1];
  }

  // Logs: the GitHub runner callback writes `logs: string[]` directly on
  // `execution_result`; the orchestrator's adapters typically surface
  // text on `output.text` / `output.output_text`. Coalesce.
  const logsArr = Array.isArray(v2.logs) ? v2.logs as unknown[] : [];
  const logs = logsArr.length > 0 ? logsArr.map(String).join("\n") : null;
  const errMsg = asString(v2.errorMessage)
    ?? asString(v2.error)
    ?? row.blocked_reason
    ?? row.error_code;

  // The github runner callback writes `github_status` directly on
  // `execution_result`; the orchestrator's github runner adapter writes
  // it under `execution_result.output.github_status`.
  const conclusion = asString(output.github_status)
    ?? asString(v2.github_status);

  return {
    id: row.id,
    prompt: asString(payload.prompt) ?? asString(payload.label) ?? row.type,
    status: row.status,
    github_run_url: runUrl,
    github_run_id: runId,
    github_workflow_name: asString(output.workflow_file)
      ?? asString(payload.workflow)
      ?? "execution-runner.yml",
    github_branch: asString(output.ref) ?? asString(payload.ref) ?? "main",
    github_conclusion: conclusion,
    logs: logs ?? errMsg,
    result: asString(output.output_text) ?? asString(v2.output_text) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function formatDuration(created: string, updated: string): string {
  const ms = new Date(updated).getTime() - new Date(created).getTime();
  if (ms < 1_000) return "<1s";
  if (ms < 60_000) return `${Math.round(ms / 1_000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1_000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function useAutosizeTextarea(
  ref: React.RefObject<HTMLTextAreaElement>,
  value: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

const CARD = "rounded-2xl border border-border bg-card flex flex-col overflow-hidden";
const CARD_HDR = "flex items-center gap-2 px-4 py-3 border-b border-border shrink-0";
const ACTIVE_STATUSES: TaskStatus[] = ["queued", "running"];
const POLL_INTERVAL_MS = 12_000;

export default function DashboardCommandCenter() {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<ExecutionTaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useAutosizeTextarea(textareaRef, prompt);

  const selectedRow = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId],
  );
  const selectedTask = useMemo(
    () => (selectedRow ? projectTask(selectedRow) : null),
    [selectedRow],
  );
  const taskViews = useMemo(() => tasks.map(projectTask), [tasks]);

  const applyTaskUpdate = useCallback((row: ExecutionTaskRow) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [row, ...prev];
    });
  }, []);

  const loadTasks = useCallback(async () => {
    if (!uid) return;
    // System schema. Reads are gated by:
    //  - execution_tasks_read_admin (admins see all)
    //  - execution_tasks_select_own_requester (owners see their own)
    const { data, error } = await supabase
      .schema("system" as never)
      .from("execution_tasks" as never)
      .select(COMMAND_CENTER_TASK_COLUMNS)
      .eq("requested_by", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error(`Failed to load tasks: ${error.message}`);
      setTasksLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as ExecutionTaskRow[];
    setTasks(rows);
    setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
    setTasksLoading(false);
  }, [uid]);

  const refreshSelectedFromDb = useCallback(async () => {
    if (!selectedId) return;
    const { data } = await supabase
      .schema("system" as never)
      .from("execution_tasks" as never)
      .select(COMMAND_CENTER_TASK_COLUMNS)
      .eq("id", selectedId)
      .maybeSingle();
    if (data) applyTaskUpdate(data as unknown as ExecutionTaskRow);
  }, [selectedId, applyTaskUpdate]);

  useEffect(() => {
    if (!uid) return;
    loadTasks();

    const channel = supabase
      .channel(`exec_tasks:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "system",
          table: "execution_tasks",
          filter: `requested_by=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as ExecutionTaskRow | null;
          if (!row?.id) return;
          applyTaskUpdate(row);
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [uid, loadTasks, applyTaskUpdate]);

  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (!selectedTask || !ACTIVE_STATUSES.includes(uiStatus(selectedTask.status))) return;
    pollTimerRef.current = setInterval(refreshSelectedFromDb, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedTask, refreshSelectedFromDb]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTask?.logs, selectedTask?.result]);

  const handleSubmit = async () => {
    if (!prompt.trim() || submitting || !uid) return;
    setSubmitting(true);

    try {
      // Track 3 (#843): the only sanctioned path is the dispatch RPC,
      // routed through the `trigger-github` Edge Function. The shared
      // helper encapsulates the invoke + read-back so it stays exercised
      // by the integration test in `lb1-track3-hardening.test.ts`.
      const result = await dispatchCommandCenterPrompt(supabase, prompt);

      if (!result.ok) {
        toast.error(`Dispatch failed: ${result.error}`);
        setSubmitting(false);
        return;
      }

      if (result.row) {
        applyTaskUpdate(result.row as unknown as ExecutionTaskRow);
      }
      setSelectedId(result.taskId);
      setPrompt("");
      toast.success(`Task dispatched · ${result.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyLogs = () => {
    const text = selectedTask?.result ?? selectedTask?.logs ?? "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 p-4 md:p-6 min-h-[calc(100dvh-4rem)]">

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Command Center</h1>
            <p className="text-xs text-muted-foreground">Submit a prompt · dispatch a GitHub workflow · track execution in real time</p>
          </div>
        </div>

        <div className={`${CARD} shrink-0`}>
          <div className={CARD_HDR}>
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">New Agent Task</span>
            <span className="ml-auto text-xs text-muted-foreground hidden sm:block">⌘ Enter to run</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want the agent to do…"
              rows={3}
              className="w-full overflow-hidden resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-[height]"
              aria-label="Agent prompt"
              disabled={submitting}
            />
            <div className="flex items-center justify-between gap-3">
              <p className={`text-xs ${prompt.length > 450 ? "text-amber-400" : "text-muted-foreground"}`}>
                {prompt.length} / 500 chars
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || submitting || prompt.length > 500}
                className="gap-2 font-semibold"
                aria-label="Run agent"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Play className="w-4 h-4" />}
                {submitting ? "Dispatching…" : "Run Agent"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">

          <div className={CARD}>
            <div className={CARD_HDR}>
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Recent Tasks</span>
              <Button
                variant="ghost" size="icon"
                className="ml-auto w-7 h-7"
                onClick={loadTasks}
                aria-label="Refresh task list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 flex flex-col gap-1">
                {tasksLoading && Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-xl">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
                {!tasksLoading && taskViews.length === 0 && (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <Terminal className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">No tasks yet.<br />Submit a prompt above.</p>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {taskViews.map((task) => (
                    <motion.button
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => setSelectedId(task.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors group ${
                        selectedId === task.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/60 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground line-clamp-2 flex-1">
                          {task.prompt}
                        </p>
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={task.status} />
                        <span className="text-[10px] text-muted-foreground">{timeAgo(task.created_at)}</span>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          <div className={CARD}>
            <div className={`${CARD_HDR} justify-between`}>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">GitHub Run</span>
              </div>
              {selectedTask && (
                <Button
                  variant="ghost" size="icon"
                  className="w-7 h-7"
                  onClick={refreshSelectedFromDb}
                  aria-label="Refresh GitHub run status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {!selectedTask && (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                  <GitBranch className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Select a task to see<br />GitHub run status.</p>
                </div>
              )}
              {selectedTask && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selectedTask.status} />
                    {selectedTask.github_conclusion && (
                      <ConclusionBadge conclusion={selectedTask.github_conclusion} />
                    )}
                    {uiStatus(selectedTask.status) === "running" && !selectedTask.github_conclusion && (
                      <span className="text-xs text-muted-foreground animate-pulse">in progress…</span>
                    )}
                  </div>

                  <Separator />

                  <dl className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <GitCommit className="w-3 h-3" />
                        Run ID
                      </dt>
                      <dd className="font-mono text-foreground truncate">
                        {selectedTask.github_run_id ?? "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <Zap className="w-3 h-3" />
                        Workflow
                      </dt>
                      <dd className="text-foreground truncate">{selectedTask.github_workflow_name ?? "—"}</dd>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <GitBranch className="w-3 h-3" />
                        Branch
                      </dt>
                      <dd className="font-mono text-foreground truncate">{selectedTask.github_branch ?? "—"}</dd>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <Timer className="w-3 h-3" />
                        Duration
                      </dt>
                      <dd className="font-mono text-foreground">
                        {uiStatus(selectedTask.status) === "queued"
                          ? "—"
                          : formatDuration(selectedTask.created_at, selectedTask.updated_at)}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <CheckCheck className="w-3 h-3" />
                        Conclusion
                      </dt>
                      <dd>
                        {selectedTask.github_conclusion
                          ? <ConclusionBadge conclusion={selectedTask.github_conclusion} />
                          : <span className="text-muted-foreground">pending</span>}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="text-foreground">{timeAgo(selectedTask.created_at)}</dd>
                    </div>
                  </dl>

                  {selectedTask.github_run_url && (
                    <>
                      <Separator />
                      <a
                        href={selectedTask.github_run_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        aria-label="View run on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View on GitHub
                      </a>
                    </>
                  )}

                  {!selectedTask.github_run_url && uiStatus(selectedTask.status) !== "queued" && (
                    <p className="text-xs text-muted-foreground italic">
                      Run URL will appear once the workflow is detected.
                    </p>
                  )}

                  {uiStatus(selectedTask.status) === "error" && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400 break-words">
                        {selectedTask.logs ?? "Unknown dispatch error"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={CARD}>
            <div className={`${CARD_HDR} justify-between`}>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Logs / Result</span>
              </div>
              {(selectedTask?.logs ?? selectedTask?.result) && (
                <Button
                  variant="ghost" size="icon"
                  className="w-7 h-7"
                  onClick={copyLogs}
                  aria-label="Copy output to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="flex-1 relative min-h-0">
              {!selectedTask && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
                  <Terminal className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Select a task to view its output.</p>
                </div>
              )}
              {selectedTask && !(selectedTask.logs ?? selectedTask.result) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
                  {ACTIVE_STATUSES.includes(uiStatus(selectedTask.status))
                    ? (
                      <>
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <p className="text-xs text-muted-foreground">Waiting for output…</p>
                      </>
                    )
                    : (
                      <>
                        <Terminal className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">No output recorded.</p>
                      </>
                    )}
                </div>
              )}
              {selectedTask && (selectedTask.result ?? selectedTask.logs) && (
                <ScrollArea className="absolute inset-0">
                  <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                    {selectedTask.result ?? selectedTask.logs}
                    <div ref={logsEndRef} />
                  </pre>
                </ScrollArea>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
