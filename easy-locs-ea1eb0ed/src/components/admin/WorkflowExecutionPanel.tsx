/**
 * Workflow Execution Panel
 * Displays real-time workflow execution logs in the admin control room.
 */
import { useState, useEffect, useCallback } from "react";
import { workflowExecutionStore, type WorkflowExecutionLog } from "@/lib/automation/workflow-execution-store";
import { workflowExecutor } from "@/lib/automation/workflow-executor";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  retrying: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  dead: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const STEP_STATUS_COLORS: Record<string, string> = {
  running: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-zinc-500",
};

function formatDuration(startedAt: number, completedAt: number | null): string {
  const end = completedAt ?? Date.now();
  const ms = end - startedAt;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function ExecutionRow({ exec }: { exec: WorkflowExecutionLog }) {
  const [expanded, setExpanded] = useState(false);
  const badge = STATUS_COLORS[exec.status] ?? STATUS_COLORS.failed;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold ${badge}`}>
          {exec.status.toUpperCase()}
        </span>
        <span className="flex-1 text-sm font-medium truncate">{exec.workflowName}</span>
        <span className="text-xs text-muted-foreground font-mono">{exec.workflowId}</span>
        <span className="text-xs text-muted-foreground ml-2">{formatTime(exec.startedAt)}</span>
        <span className="text-xs text-muted-foreground ml-2">
          {formatDuration(exec.startedAt, exec.completedAt)}
        </span>
        {exec.retryCount > 0 && (
          <span className="text-xs text-amber-400 ml-1">{exec.retryCount}x retry</span>
        )}
        <span className="ml-2 text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/10 px-4 py-3 space-y-2">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Trigger: <span className="font-mono text-foreground">{exec.triggerEvent}</span></span>
            <span>Execution ID: <span className="font-mono text-foreground">{exec.executionId}</span></span>
          </div>

          {exec.error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 font-mono">
              {exec.error}
            </div>
          )}

          {exec.stepLogs.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Steps</div>
              {exec.stepLogs.map((step, i) => (
                <div key={`${step.stepId}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    step.status === "completed" ? "bg-emerald-500" :
                    step.status === "running" ? "bg-blue-500 animate-pulse" :
                    step.status === "failed" ? "bg-red-500" :
                    "bg-zinc-600"
                  }`} />
                  <span className={`${STEP_STATUS_COLORS[step.status] ?? ""}`}>{step.stepName}</span>
                  <span className="text-muted-foreground">{step.stepId}</span>
                  {step.attempt > 1 && <span className="text-amber-400">attempt {step.attempt}</span>}
                  {step.completedAt && (
                    <span className="text-muted-foreground ml-auto">
                      {formatDuration(step.startedAt, step.completedAt)}
                    </span>
                  )}
                  {step.error && (
                    <span className="text-red-400 truncate max-w-xs">{step.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WorkflowExecutionPanel() {
  const [executions, setExecutions] = useState<WorkflowExecutionLog[]>([]);
  const [stats, setStats] = useState(workflowExecutionStore.getStats());
  const [filter, setFilter] = useState<"all" | "running" | "completed" | "failed" | "dead">("all");

  const refresh = useCallback(() => {
    setExecutions(workflowExecutionStore.getRecent(100));
    setStats(workflowExecutionStore.getStats());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = workflowExecutionStore.subscribe(refresh);
    return unsub;
  }, [refresh]);

  const filtered = filter === "all"
    ? executions
    : executions.filter((e) =>
        filter === "running"
          ? (e.status === "running" || e.status === "retrying")
          : e.status === filter
      );

  const allWorkflows = workflowExecutor.getWorkflows();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Automation Workflows</h2>
          <p className="text-sm text-muted-foreground">
            {allWorkflows.length} workflows registered — {workflowExecutor.isStarted() ? "executor running" : "executor stopped"}
          </p>
        </div>
        <button
          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/50 transition-colors"
          onClick={refresh}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Running", value: stats.running, color: "text-blue-400" },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Failed", value: stats.failed, color: "text-red-400" },
          { label: "Dead Letter", value: stats.dead, color: "text-zinc-400" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/20 border border-border rounded-lg px-3 py-2 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "running", "completed", "failed", "dead"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-primary/20 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8 border border-dashed border-border rounded-lg">
          {filter === "all"
            ? "No workflow executions recorded yet. Workflows fire automatically when their trigger events are emitted."
            : `No ${filter} executions.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exec) => (
            <ExecutionRow key={exec.executionId} exec={exec} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Registered Workflows</h3>
        <div className="space-y-1">
          {allWorkflows.map((wf) => (
            <div key={wf.workflowId} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/50">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${wf.status === "active" ? "bg-emerald-500" : "bg-zinc-500"}`} />
              <span className="font-medium w-48 truncate">{wf.name}</span>
              <span className="font-mono text-muted-foreground">{wf.workflowId}</span>
              <span className="text-muted-foreground ml-auto">
                {wf.trigger.type === "event" ? `on: ${wf.trigger.eventName}` : `schedule: ${wf.trigger.schedule}`}
              </span>
              <span className="text-muted-foreground">{wf.steps.length} steps</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
