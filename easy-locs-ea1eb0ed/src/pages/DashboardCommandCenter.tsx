import { useState, useEffect, useRef, useCallback } from "react";
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
import type { Database } from "@/integrations/supabase/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

type AgentTaskRow = Database["public"]["Tables"]["agent_tasks"]["Row"];
type AgentTaskInsert = Database["public"]["Tables"]["agent_tasks"]["Insert"];
type TaskStatus = "queued" | "running" | "success" | "error";

function taskStatus(raw: string): TaskStatus {
  if (raw === "queued" || raw === "running" || raw === "success" || raw === "error") return raw;
  return "queued";
}

const STATUS_META: Record<TaskStatus, {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}> = {
  queued:  { label: "Queued",  Icon: Clock,       color: "text-amber-400",   bg: "bg-amber-400/10" },
  running: { label: "Running", Icon: Loader2,      color: "text-blue-400",    bg: "bg-blue-400/10"  },
  success: { label: "Success", Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10"},
  error:   { label: "Error",   Icon: XCircle,      color: "text-red-400",     bg: "bg-red-400/10"   },
};

function StatusBadge({ status }: { status: string }) {
  const s = taskStatus(status);
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
  const [tasks, setTasks] = useState<AgentTaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<AgentTaskRow | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useAutosizeTextarea(textareaRef, prompt);

  const applyTaskUpdate = useCallback((row: AgentTaskRow) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [row, ...prev];
    });
    setSelectedTask((prev) => (prev?.id === row.id ? row : prev));
  }, []);

  const loadTasks = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setTasks(data);
      setSelectedTask((prev) => {
        if (!prev && data.length > 0) return data[0];
        if (prev) return data.find((t) => t.id === prev.id) ?? prev;
        return prev;
      });
    }
    setTasksLoading(false);
  }, [uid]);

  const refreshSelectedFromGitHub = useCallback(async () => {
    if (!selectedTask?.id || !uid) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    try {
      const { data } = await supabase.functions.invoke(
        "trigger-github",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-task-id": selectedTask.id,
          },
        },
      );
      const refreshed = (data as { task?: AgentTaskRow } | null)?.task;
      if (refreshed) applyTaskUpdate(refreshed);
    } catch {
    }
  }, [selectedTask?.id, uid, applyTaskUpdate]);

  useEffect(() => {
    if (!uid) return;
    loadTasks();

    const channel = supabase
      .channel(`agent_tasks:${uid}`)
      .on<AgentTaskRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_tasks", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as AgentTaskRow;
          if (!row?.id) return;
          applyTaskUpdate(row);
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [uid, applyTaskUpdate]);

  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (!selectedTask || !ACTIVE_STATUSES.includes(taskStatus(selectedTask.status))) return;
    pollTimerRef.current = setInterval(refreshSelectedFromGitHub, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedTask?.id, selectedTask?.status, refreshSelectedFromGitHub]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTask?.logs, selectedTask?.result]);

  const handleSubmit = async () => {
    if (!prompt.trim() || submitting || !uid) return;
    setSubmitting(true);

    try {
      const insert: AgentTaskInsert = { user_id: uid, prompt: prompt.trim(), status: "queued" };
      const { data: inserted, error: insertErr } = await supabase
        .from("agent_tasks")
        .insert(insert)
        .select()
        .single();

      if (insertErr || !inserted) {
        toast.error(`Failed to create task: ${insertErr?.message ?? "unknown error"}`);
        setSubmitting(false);
        return;
      }

      setTasks((prev) => [inserted, ...prev]);
      setSelectedTask(inserted);
      setPrompt("");

      // GitHub dispatch is being migrated to the canonical execution path
      // (system.dispatch_execution_task → github.WORKFLOW_DISPATCH adapter).
      // Until F1-F3 of the migration land, the prompt is journaled to
      // agent_tasks (queued) and the 4-zone UI renders normally.
      toast.success("Task queued (journaled)");
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
                {!tasksLoading && tasks.length === 0 && (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <Terminal className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">No tasks yet.<br />Submit a prompt above.</p>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {tasks.map((task) => (
                    <motion.button
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full text-left p-3 rounded-xl transition-colors group ${
                        selectedTask?.id === task.id
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
                  onClick={refreshSelectedFromGitHub}
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
                    {taskStatus(selectedTask.status) === "running" && !selectedTask.github_conclusion && (
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
                        {selectedTask.github_run_id ? String(selectedTask.github_run_id) : "—"}
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
                        {taskStatus(selectedTask.status) === "queued"
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

                  {!selectedTask.github_run_url && taskStatus(selectedTask.status) !== "queued" && (
                    <p className="text-xs text-muted-foreground italic">
                      Run URL will appear once the workflow is detected.
                    </p>
                  )}

                  {taskStatus(selectedTask.status) === "error" && (
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
                  {ACTIVE_STATUSES.includes(taskStatus(selectedTask.status))
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
                  <pre className="p-4 text-[11px] font-mono leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
                    {selectedTask.result ?? selectedTask.logs}
                  </pre>
                  <div ref={logsEndRef} />
                </ScrollArea>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
