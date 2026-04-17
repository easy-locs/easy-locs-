import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, Clock,
  AlertTriangle, ExternalLink, Terminal, Activity, Target, Sparkles, Zap,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  mode: string;
  created_at: string;
}

interface GoalIteration {
  id: string;
  goal_id: string;
  iteration_number: number;
  task_ids: string[];
  outcome: string;
  score: number | null;
  plan_source: string | null;
  plan_provider: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ExecutionTask {
  id: string;
  type: string;
  domain: string;
  status: string;
  runner: string | null;
  pr_url: string | null;
  external_run_url: string | null;
  goal_id: string | null;
  requested_by: string | null;
  updated_at: string;
  created_at: string;
}

interface EngineRunLog {
  id: number;
  engine_name: string;
  category: string;
  status: string;
  effect_summary: string | null;
  error_message: string | null;
  duration_ms: number | null;
  started_at: string;
  metadata_json: Record<string, unknown> | null;
}

interface PlannerResult {
  goal_id: string;
  iteration_id?: string;
  iteration_number?: number;
  mode?: string;
  plan: Array<{ type: string; domain: string; rationale: string }>;
  plan_source: "ai" | "fallback";
  plan_provider: string | null;
  dispatched: Array<{
    task_id: string | null;
    type: string;
    domain: string;
    status: string | null;
    error?: string;
  }>;
}

function statusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "succeeded":
    case "completed": return "default";
    case "running":
    case "active": return "secondary";
    case "failed":
    case "blocked": return "destructive";
    default: return "outline";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "succeeded": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "running": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "failed":
    case "blocked": return <XCircle className="w-4 h-4 text-red-500" />;
    case "queued": return <Clock className="w-4 h-4 text-yellow-500" />;
    default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function callEdge<T>(name: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const url = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `${name} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export default function CommandCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastPlanner, setLastPlanner] = useState<PlannerResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [replanning, setReplanning] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<{ task_id: string; status: string } | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const { data: goals = [], isFetching: goalsFetching } = useQuery<Goal[]>({
    queryKey: ["command-center-goals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .schema("system")
        .from("goals")
        .select("id, title, description, status, priority, mode, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
    enabled: !!user?.id,
    refetchInterval: 8000,
  });

  const { data: iterations = [] } = useQuery<GoalIteration[]>({
    queryKey: ["command-center-iterations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .schema("system")
        .from("goal_iterations")
        .select("id, goal_id, iteration_number, task_ids, outcome, score, plan_source, plan_provider, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as GoalIteration[];
    },
    enabled: !!user?.id,
    refetchInterval: 8000,
  });

  const iterationsByGoal = useMemo(() => {
    const m = new Map<string, GoalIteration[]>();
    for (const it of iterations) {
      if (!m.has(it.goal_id)) m.set(it.goal_id, []);
      m.get(it.goal_id)!.push(it);
    }
    return m;
  }, [iterations]);

  const { data: tasks = [], isFetching: tasksFetching } = useQuery<ExecutionTask[]>({
    queryKey: ["command-center-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .schema("system")
        .from("execution_tasks")
        .select("id, type, domain, status, runner, pr_url, external_run_url, goal_id, requested_by, updated_at, created_at")
        .eq("requested_by", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ExecutionTask[];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const tasksByGoal = useMemo(() => {
    const m = new Map<string, ExecutionTask[]>();
    for (const t of tasks) {
      const key = t.goal_id ?? "__none__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    return m;
  }, [tasks]);

  const taskIds = tasks.map((t) => t.id);

  const { data: logs = [], isFetching: logsFetching } = useQuery<EngineRunLog[]>({
    queryKey: ["command-center-logs", taskIds.join(",")],
    queryFn: async () => {
      if (taskIds.length === 0) return [];
      const orFilter = taskIds.map((id) => `metadata_json->>task_id.eq.${id}`).join(",");
      const { data, error } = await supabase
        .from("engine_run_logs")
        .select("id, engine_name, category, status, effect_summary, error_message, duration_ms, started_at, metadata_json")
        .or(orFilter)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as EngineRunLog[];
    },
    refetchInterval: 8000,
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSubmitting(true);
    setLastPlanner(null);
    setLastError(null);
    try {
      const result = await callEdge<{ goal: Goal; planner: PlannerResult | null }>(
        "goal-create",
        { title: t, description: description.trim() || null, run_planner: true },
      );
      setLastPlanner(result.planner ?? null);
      toast.success(`Goal created — ${result.planner?.dispatched.length ?? 0} step(s) dispatched`);
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["command-center-goals", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["command-center-tasks", user?.id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setLastError(msg);
      toast.error(`Goal creation failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }, [title, description, queryClient, user?.id]);

  const handleReplan = useCallback(async (goalId: string) => {
    setReplanning(goalId);
    setLastError(null);
    try {
      const result = await callEdge<PlannerResult>("goal-planner", { goal_id: goalId });
      setLastPlanner(result);
      toast.success(`Replanned — ${result.dispatched.length} step(s) dispatched`);
      queryClient.invalidateQueries({ queryKey: ["command-center-tasks", user?.id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setLastError(msg);
      toast.error(`Replan failed: ${msg}`);
    } finally {
      setReplanning(null);
    }
  }, [queryClient, user?.id]);

  const handleTrigger = useCallback(async () => {
    setTriggering(true);
    setLastTrigger(null);
    setTriggerError(null);
    try {
      const result = await callEdge<{ task_id: string; status: string }>("trigger-github", {});
      setLastTrigger(result);
      toast.success(`Smoke task triggered — ${result.task_id.slice(0, 8)}…`);
      queryClient.invalidateQueries({ queryKey: ["command-center-tasks", user?.id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setTriggerError(msg);
      toast.error(`Trigger failed: ${msg}`);
    } finally {
      setTriggering(false);
    }
  }, [queryClient, user?.id]);

  const handleRefresh = useCallback(async () => {
    // Recompute outcome for any pending iteration of the user's goals.
    const pendingGoalIds = Array.from(
      new Set(iterations.filter((i) => i.outcome === "pending").map((i) => i.goal_id)),
    );
    await Promise.all(
      pendingGoalIds.map((gid) =>
        supabase.schema("system").rpc("refresh_goal_iterations", { p_goal_id: gid }),
      ),
    );
    queryClient.invalidateQueries({ queryKey: ["command-center-goals", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["command-center-tasks", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["command-center-iterations", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["command-center-logs"] });
  }, [iterations, queryClient, user?.id]);

  const orphanTasks = tasksByGoal.get("__none__") ?? [];

  return (
    <DashboardLayout>
      <div className="px-4 pt-6 pb-10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set a goal. The planner breaks it into governed execution steps.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${tasksFetching || goalsFetching || logsFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" />
              New Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder='e.g. "improve onboarding conversion"'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                disabled={submitting}
              />
              <Textarea
                placeholder="Optional context: success criteria, constraints, deadlines…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={4000}
                disabled={submitting}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="submit" disabled={submitting || !title.trim()} className="gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {submitting ? "Planning…" : "Plan & Execute"}
                </Button>
                {lastPlanner && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {lastPlanner.dispatched.length} step(s) — source: {lastPlanner.plan_source}
                    {lastPlanner.plan_provider ? ` (${lastPlanner.plan_provider})` : ""}
                  </span>
                )}
                {lastError && (
                  <span className="text-xs text-destructive font-mono">{lastError}</span>
                )}
              </div>
            </form>

            {lastPlanner && lastPlanner.plan.length > 0 && (
              <div className="mt-4 rounded-md border border-border/50 bg-muted/30 p-3 space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Generated plan
                </p>
                {lastPlanner.plan.map((step, i) => (
                  <div key={i} className="text-xs flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">{i + 1}.</span>
                    <div className="flex-1">
                      <span className="font-mono text-foreground">{step.domain} / {step.type}</span>
                      <span className="text-muted-foreground"> — {step.rationale}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AppCard>

        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No goals yet. Set one above to start the loop.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {goals.map((goal) => {
                  const goalTasks = tasksByGoal.get(goal.id) ?? [];
                  const goalIters = iterationsByGoal.get(goal.id) ?? [];
                  return (
                    <div key={goal.id} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{goal.title}</span>
                            <Badge variant={statusColor(goal.status)} className="text-[10px] h-5 px-1.5">
                              {goal.status}
                            </Badge>
                            {goal.mode && goal.mode !== "execute" && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                {goal.mode}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">P{goal.priority}</span>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(goal.created_at)}</span>
                          </div>
                          {goal.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReplan(goal.id)}
                          disabled={replanning === goal.id || goal.status !== "active"}
                          className="gap-1.5 h-7"
                        >
                          {replanning === goal.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Sparkles className="w-3 h-3" />}
                          Replan
                        </Button>
                      </div>
                      {goalIters.length > 0 && (
                        <div className="ml-3 pl-3 border-l border-border/60 space-y-1.5">
                          {goalIters.slice(0, 3).map((it) => (
                            <div key={it.id} className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="font-mono text-muted-foreground">
                                #{it.iteration_number}
                              </span>
                              <Badge
                                variant={
                                  it.outcome === "succeeded" ? "default"
                                  : it.outcome === "failed" ? "destructive"
                                  : it.outcome === "partial" ? "secondary" : "outline"
                                }
                                className="text-[10px] h-5 px-1.5"
                              >
                                {it.outcome}
                              </Badge>
                              {it.score != null && (
                                <span className="text-muted-foreground">
                                  score {(it.score * 100).toFixed(0)}%
                                </span>
                              )}
                              {it.plan_source && (
                                <span className="text-muted-foreground/70">
                                  · {it.plan_source}{it.plan_provider ? ` (${it.plan_provider})` : ""}
                                </span>
                              )}
                              <span className="text-muted-foreground/70">
                                · {it.task_ids?.length ?? 0} task(s)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {goalTasks.length > 0 && (
                        <div className="ml-3 pl-3 border-l border-border space-y-1">
                          {goalTasks.map((t) => (
                            <TaskRow key={t.id} task={t} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </AppCard>

        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-primary" />
              Trigger Agent
              <span className="text-[11px] font-normal text-muted-foreground">
                — direct smoke test, bypasses the planner
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleTrigger} disabled={triggering} variant="outline" className="gap-2">
                {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {triggering ? "Triggering…" : "Trigger Agent"}
              </Button>
              {lastTrigger && (
                <span className="text-xs text-muted-foreground font-mono">
                  task: {lastTrigger.task_id.slice(0, 13)}… &mdash; {lastTrigger.status}
                </span>
              )}
              {triggerError && (
                <span className="text-xs text-destructive font-mono">{triggerError}</span>
              )}
            </div>
          </CardContent>
        </AppCard>

        {orphanTasks.length > 0 && (
          <AppCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Other Tasks
                <span className="text-[11px] font-normal text-muted-foreground">
                  — not linked to a goal
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {orphanTasks.map((t) => <TaskRow key={t.id} task={t} />)}
              </div>
            </CardContent>
          </AppCard>
        )}

        <AppCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="w-4 h-4 text-primary" />
              Logs
              {taskIds.length > 0 && (
                <span className="text-[11px] font-normal text-muted-foreground ml-1">
                  — correlated to your tasks
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {taskIds.length === 0
                  ? "Create a goal to see correlated logs here."
                  : "No log entries found for these tasks yet."}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start gap-3">
                    <div className="mt-0.5">
                      {log.status === "ok" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : log.status === "error" ? (
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-foreground truncate max-w-[180px]">
                          {log.engine_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{log.category}</span>
                        {log.duration_ms != null && (
                          <span className="text-[11px] text-muted-foreground">
                            {log.duration_ms < 1000
                              ? `${log.duration_ms}ms`
                              : `${(log.duration_ms / 1000).toFixed(1)}s`}
                          </span>
                        )}
                      </div>
                      {(log.effect_summary || log.error_message) && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {log.error_message || log.effect_summary}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground/70">
                        {timeAgo(log.started_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AppCard>
      </div>
    </DashboardLayout>
  );
}

function TaskRow({ task }: { task: ExecutionTask }) {
  return (
    <div className="py-2 flex items-start gap-2">
      <StatusIcon status={task.status} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-foreground">{task.id.slice(0, 8)}…</span>
          <Badge variant={statusColor(task.status)} className="text-[10px] h-5 px-1.5">
            {task.status}
          </Badge>
          {task.runner && task.runner !== "internal" && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{task.runner}</Badge>
          )}
          <span className="text-[11px] text-muted-foreground">{task.domain} / {task.type}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-muted-foreground">
            updated {timeAgo(task.updated_at)}
          </span>
          {task.pr_url && (
            <a
              href={task.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary underline flex items-center gap-1"
            >
              PR <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {task.external_run_url && (
            <a
              href={task.external_run_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground underline flex items-center gap-1"
            >
              Run <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
