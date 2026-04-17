import SubPageShell from "@/components/layout/SubPageShell";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUiEngine } from "@/hooks/useUiEngine";
import { db } from "@/services/db";
import { commandCenterClient } from "@/services/command-center-client";
import { taskDispatcher } from "@/core/execution";
import { dashboardRepo } from "@/repositories/domain/dashboard.repo";
import { ExecutionTaskPanel } from "@/components/admin/ExecutionTaskPanel";
import { AgentCommandConsole } from "@/components/admin/AgentCommandConsole";

type TabId =
  | "overview"
  | "execution"
  | "live-tasks"
  | "console"
  | "agents"
  | "approvals"
  | "monitoring"
  | "health"
  | "costs"
  | "audit";

export default function CommandControlDashboard() {
  useUiEngine("admin-commandcontroldashboard");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId | null) ?? "overview";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <span className="text-foreground">&#8592;</span>
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Command & Control</h1>
          <p className="text-xs text-muted-foreground">Agent oversight, approvals & monitoring</p>
        </div>
      </div>

      <div className="flex gap-1 px-4 pb-4 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "execution" && <ExecutionTab />}
        {activeTab === "live-tasks" && <ExecutionTaskPanel />}
        {activeTab === "console" && <AgentCommandConsole />}
        {activeTab === "agents" && <AgentsTab />}
        {activeTab === "approvals" && <ApprovalsTab />}
        {activeTab === "monitoring" && <MonitoringTab />}
        {activeTab === "health" && <HealthTab />}
        {activeTab === "costs" && <CostsTab />}
        {activeTab === "audit" && <AuditTab />}
      </div>
    </SubPageShell>
  );
}

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "execution", label: "Execution" },
  { id: "live-tasks", label: "Live Tasks" },
  { id: "console", label: "Agent Console" },
  { id: "agents", label: "Agents" },
  { id: "approvals", label: "Approvals" },
  { id: "monitoring", label: "Monitoring" },
  { id: "health", label: "Health" },
  { id: "costs", label: "Costs" },
  { id: "audit", label: "Audit Log" },
];

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["cc-overview"],
    queryFn: async () => {
      const [agents, approvals, findings, health, execPending, execRunning, execBlocked] = await Promise.all([
        db("agent_actions").select("*", { count: "exact", head: true }).eq("status", "running"),
        db("approval_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        db("monitoring_findings").select("*", { count: "exact", head: true }).eq("status", "open"),
        db("system_health_snapshots").select("*").order("checked_at", { ascending: false }).limit(10),
        dashboardRepo.countExecutionTasks({ status: "queued" }).catch(() => 0),
        dashboardRepo.countExecutionTasks({ status: "running" }).catch(() => 0),
        dashboardRepo.countExecutionTasks({ status: "blocked" }).catch(() => 0),
      ]);
      return {
        activeAgents: agents.count || 0,
        pendingApprovals: approvals.count || 0,
        openFindings: findings.count || 0,
        healthComponents: health.data || [],
        execPending,
        execRunning,
        execBlocked,
      };
    },
    staleTime: 15000,
  });

  if (isLoading) return <LoadingSkeleton count={4} />;

  const downCount = stats?.healthComponents.filter((h: { status: string }) => h.status === "down").length || 0;

  return (
    <div className="space-y-4">
      <ServerBrainOverview />
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Active Agents" value={stats?.activeAgents ?? 0} color="blue" />
        <MetricCard label="Pending Approvals" value={stats?.pendingApprovals ?? 0} color={stats?.pendingApprovals ? "amber" : "green"} />
        <MetricCard label="Open Findings" value={stats?.openFindings ?? 0} color={stats?.openFindings ? "red" : "green"} />
        <MetricCard label="Systems Down" value={downCount} color={downCount > 0 ? "red" : "green"} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Autonomous Execution</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Pending" value={stats?.execPending ?? 0} color={stats?.execPending ? "amber" : "green"} />
          <MetricCard label="Running" value={stats?.execRunning ?? 0} color={stats?.execRunning ? "blue" : "green"} />
          <MetricCard label="Blocked" value={stats?.execBlocked ?? 0} color={stats?.execBlocked ? "red" : "green"} />
        </div>
      </div>
      <EngineHealthScores />
      <PlatformHealthIndicators />
      <RecentActivityFeed />
    </div>
  );
}

function AgentsTab() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ["cc-agents"],
    queryFn: async () => {
      const { data } = await db("agent_actions").select("*").order("started_at", { ascending: false }).limit(50);
      return data || [];
    },
    staleTime: 10000,
  });

  const { data: serverAgents } = useQuery({
    queryKey: ["cc-server-agents"],
    queryFn: async () => {
      const result = await commandCenterClient.getAgents();
      return result.agents;
    },
    staleTime: 15000,
  });

  const qc = useQueryClient();
  const quarantineMut = useMutation({
    mutationFn: (engineName: string) =>
      commandCenterClient.quarantineEngine(engineName, "Manual quarantine from dashboard"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cc-server-agents"] });
      qc.invalidateQueries({ queryKey: ["cc-server-brain-status"] });
    },
  });
  const releaseMut = useMutation({
    mutationFn: (engineName: string) =>
      commandCenterClient.releaseEngine(engineName, "admin-dashboard"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cc-server-agents"] });
      qc.invalidateQueries({ queryKey: ["cc-server-brain-status"] });
    },
  });

  if (isLoading) return <LoadingSkeleton count={5} />;

  return (
    <div className="space-y-3">
      {serverAgents && serverAgents.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-foreground">Server Brain Agents</h2>
          {serverAgents.map((sa) => (
            <div key={sa.agent_name} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{sa.agent_name}</span>
                <StatusBadge status={sa.status} />
              </div>
              <div className="flex gap-3 text-[0.625rem] text-muted-foreground mb-2">
                <span>Restarts: {sa.restart_count}</span>
                <span>Last beat: {formatRelativeTime(sa.last_beat_at)}</span>
              </div>
              <div className="flex gap-2">
                {sa.status !== "quarantined" && (
                  <button
                    onClick={() => quarantineMut.mutate(sa.agent_name)}
                    disabled={quarantineMut.isPending}
                    className="px-2 py-1 text-[0.625rem] rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium"
                  >
                    Quarantine
                  </button>
                )}
                {(sa.status === "quarantined" || sa.status === "dead") && (
                  <button
                    onClick={() => releaseMut.mutate(sa.agent_name)}
                    disabled={releaseMut.isPending}
                    className="px-2 py-1 text-[0.625rem] rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium"
                  >
                    Release
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
      {agents?.length === 0 && <EmptyState message="No agent activity recorded yet" />}
      {agents?.map((agent: Record<string, unknown>) => (
        <div key={agent.id as string} className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">{agent.agent_name as string}</span>
            <StatusBadge status={agent.status as string} />
          </div>
          <p className="text-xs text-muted-foreground mb-1">{agent.action_type as string}: {agent.description as string}</p>
          <div className="flex gap-3 text-[0.625rem] text-muted-foreground">
            {agent.pr_number && <span>PR #{agent.pr_number as number}</span>}
            {agent.branch_name && <span>{agent.branch_name as string}</span>}
            <span>{formatRelativeTime(agent.started_at as string)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprovalsTab() {
  const queryClient = useQueryClient();
  const { data: approvals, isLoading } = useQuery({
    queryKey: ["cc-approvals"],
    queryFn: async () => {
      const { data } = await db("approval_requests").select("*").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
    staleTime: 10000,
  });

  const dispatchApproval = async (
    pr: Record<string, unknown>,
    action: "approve" | "reject" | "escalate",
  ) => {
    // Phase-1 Autonomous Execution Layer: route the approval through the dispatcher.
    // PR approvals touch code → CRITICAL by classification, requiring an explicit
    // approver. Without one (phase-1 default), the task is BLOCKED, never RUNNING.
    try {
      await taskDispatcher.dispatch({
        type: action === "approve" ? "CODE_PATCH" : "REVIEW_QUEUE_RESOLUTION",
        domain: "orchestrator-pr",
        payload: {
          source: "CommandControlDashboard.ApprovalsTab",
          approvalRequestId: pr.id,
          prNumber: pr.pr_number,
          prTitle: pr.pr_title,
          riskAssessment: pr.risk_assessment,
          agentName: pr.agent_name,
          action,
        },
        requestedBy: "command-control-dashboard",
        idempotencyKey: `pr-approval:${pr.id}:${action}`,
      });
    } catch (err) {
      console.warn("[CommandControlDashboard.ApprovalsTab] dispatcher error", err);
    }
    queryClient.invalidateQueries({ queryKey: ["cc-approvals"] });
  };

  if (isLoading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">PR Approvals</h2>
      {approvals?.length === 0 && <EmptyState message="No approval requests yet" />}
      {approvals?.map((pr: Record<string, unknown>) => (
        <div key={pr.id as string} className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">#{pr.pr_number as number}</span>
            <StatusBadge status={pr.status as string} />
          </div>
          <p className="text-xs text-foreground mb-1">{pr.pr_title as string}</p>
          <div className="flex items-center gap-2 mb-2">
            <RiskBadge risk={pr.risk_assessment as string} />
            {pr.agent_name && <span className="text-[0.625rem] text-muted-foreground">by {pr.agent_name as string}</span>}
          </div>
          {pr.diff_summary && (
            <pre className="text-[0.625rem] bg-muted/50 p-2 rounded-lg overflow-x-auto max-h-32 text-muted-foreground">
              {(pr.diff_summary as string).slice(0, 500)}
            </pre>
          )}
          {pr.reviewer_feedback && (
            <p className="text-[0.625rem] text-muted-foreground mt-2 italic">Feedback: {pr.reviewer_feedback as string}</p>
          )}
          <p className="text-[0.625rem] text-muted-foreground mt-1">{formatRelativeTime(pr.created_at as string)}</p>
          {(pr.status as string) === "pending" && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => dispatchApproval(pr, "approve")}
                className="text-[0.625rem] px-2 py-1 rounded-lg bg-primary text-primary-foreground"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => dispatchApproval(pr, "reject")}
                className="text-[0.625rem] px-2 py-1 rounded-lg bg-destructive text-destructive-foreground"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => dispatchApproval(pr, "escalate")}
                className="text-[0.625rem] px-2 py-1 rounded-lg border border-border/40 text-foreground"
              >
                Escalate
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MonitoringTab() {
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  const { data: findings, isLoading } = useQuery({
    queryKey: ["cc-monitoring", levelFilter],
    queryFn: async () => {
      let query = db("monitoring_findings").select("*").order("created_at", { ascending: false }).limit(50);
      if (levelFilter) query = query.eq("level", levelFilter);
      const { data } = await query;
      return data || [];
    },
    staleTime: 10000,
  });

  if (isLoading) return <LoadingSkeleton count={5} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Monitoring Findings</h2>
        <div className="flex gap-1">
          {[null, 1, 2, 3].map((level) => (
            <button
              key={level ?? "all"}
              onClick={() => setLevelFilter(level)}
              className={`px-2 py-1 rounded text-[0.625rem] font-medium ${
                levelFilter === level ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {level ? `L${level}` : "All"}
            </button>
          ))}
        </div>
      </div>
      {findings?.length === 0 && <EmptyState message="No findings recorded" />}
      {findings?.map((f: Record<string, unknown>) => (
        <div key={f.id as string} className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-muted">L{f.level as number}</span>
              <SeverityBadge severity={f.severity as string} />
            </div>
            <StatusBadge status={f.status as string} />
          </div>
          <p className="text-sm font-semibold text-foreground mt-1">{f.title as string}</p>
          <p className="text-xs text-muted-foreground mt-1">{f.description as string}</p>
          <div className="flex gap-3 text-[0.625rem] text-muted-foreground mt-2">
            <span>{f.category as string}</span>
            {f.source_engine && <span>{f.source_engine as string}</span>}
            <span>{formatRelativeTime(f.created_at as string)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthTab() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["cc-health"],
    queryFn: async () => {
      const { data } = await db("system_health_snapshots").select("*").order("checked_at", { ascending: false }).limit(30);
      return data || [];
    },
    staleTime: 10000,
  });

  if (isLoading) return <LoadingSkeleton count={4} />;

  const latestByComponent = new Map<string, Record<string, unknown>>();
  for (const snap of health || []) {
    if (!latestByComponent.has(snap.component as string)) {
      latestByComponent.set(snap.component as string, snap);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">System Health</h2>
      {latestByComponent.size === 0 && <EmptyState message="No health data recorded yet" />}
      {[...latestByComponent.entries()].map(([component, snap]) => (
        <div key={component} className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{component}</span>
            <HealthBadge status={snap.status as string} />
          </div>
          {snap.response_time_ms && (
            <p className="text-xs text-muted-foreground mt-1">
              Response: <span className="font-semibold tabular-nums">{snap.response_time_ms as number}ms</span>
            </p>
          )}
          <p className="text-[0.625rem] text-muted-foreground mt-1">{formatRelativeTime(snap.checked_at as string)}</p>
        </div>
      ))}
    </div>
  );
}

function CostsTab() {
  const { data: costs, isLoading } = useQuery({
    queryKey: ["cc-costs"],
    queryFn: async () => {
      const { data } = await db("cost_tracking").select("*").order("date", { ascending: false }).limit(50);
      return data || [];
    },
    staleTime: 30000,
  });

  if (isLoading) return <LoadingSkeleton count={4} />;

  const agentTotals = new Map<string, { cost: number; tokens: number; calls: number }>();
  for (const c of costs || []) {
    const existing = agentTotals.get(c.agent_name as string) || { cost: 0, tokens: 0, calls: 0 };
    existing.cost += Number(c.cost_usd);
    existing.tokens += c.total_tokens as number;
    existing.calls += c.api_calls as number;
    agentTotals.set(c.agent_name as string, existing);
  }

  const totalCost = [...agentTotals.values()].reduce((s, v) => s + v.cost, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <p className="text-xs text-muted-foreground">Total Cost (7d)</p>
        <p className="text-2xl font-bold text-foreground tabular-nums">${totalCost.toFixed(2)}</p>
      </div>
      <h2 className="text-sm font-semibold text-foreground">Cost by Agent</h2>
      {agentTotals.size === 0 && <EmptyState message="No cost data recorded" />}
      {[...agentTotals.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([agent, data]) => (
        <div key={agent} className="rounded-2xl border border-border/20 bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-foreground">{agent}</span>
            <span className="text-sm font-bold tabular-nums text-foreground">${data.cost.toFixed(2)}</span>
          </div>
          <div className="flex gap-4 text-[0.625rem] text-muted-foreground">
            <span>{data.tokens.toLocaleString()} tokens</span>
            <span>{data.calls} API calls</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (data.cost / Math.max(totalCost, 1)) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTab() {
  const [search, setSearch] = useState("");
  const { data: logs, isLoading } = useQuery({
    queryKey: ["cc-audit", search],
    queryFn: async () => {
      let query = db("command_audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      if (search) query = query.or(`action.ilike.%${search}%,event_type.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
    staleTime: 10000,
  });

  if (isLoading) return <LoadingSkeleton count={5} />;

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search audit log..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-muted border border-border/20 text-sm text-foreground placeholder:text-muted-foreground"
      />
      {logs?.length === 0 && <EmptyState message="No audit events found" />}
      {logs?.map((log: Record<string, unknown>) => (
        <div key={log.id as string} className="rounded-2xl border border-border/20 bg-card p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {log.event_type as string}
            </span>
            <span className="text-[0.625rem] text-muted-foreground">{formatRelativeTime(log.created_at as string)}</span>
          </div>
          <p className="text-xs text-foreground">{log.action as string}</p>
          <div className="flex gap-2 mt-1 text-[0.625rem] text-muted-foreground">
            <span>{log.actor_type as string}{log.actor_name ? `: ${log.actor_name}` : ""}</span>
            {log.target_type && <span>{log.target_type as string}:{log.target_id as string}</span>}
            {log.rollback_tag && <span className="text-amber-500">tag:{log.rollback_tag as string}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ServerBrainOverview() {
  const { data: brainStatus, isLoading } = useQuery({
    queryKey: ["cc-server-brain-status"],
    queryFn: () => commandCenterClient.getStatus(),
    staleTime: 15000,
    retry: 1,
  });

  if (isLoading) return <LoadingSkeleton count={1} />;
  if (!brainStatus) return null;

  const decision = brainStatus.latest_omega_decision;
  const verdict = decision?.verdict ?? "N/A";
  const globalScore = decision?.global_score ?? 0;
  const engineStatuses = decision?.engine_statuses ?? {};

  const verdictColor =
    verdict === "PASS"
      ? "text-green-500"
      : verdict === "BLOCKED"
        ? "text-red-500"
        : verdict === "DEGRADED"
          ? "text-amber-500"
          : "text-foreground";

  const scoreColor =
    globalScore >= 80
      ? "text-green-500"
      : globalScore >= 60
        ? "text-amber-500"
        : "text-red-500";

  const aliveAgents = brainStatus.agent_heartbeats.filter(
    (a) => (a as { status: string }).status === "alive",
  ).length;

  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Server Brain</h3>
        <HealthBadge status={brainStatus.overall_health} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[0.625rem] text-muted-foreground">Score</p>
          <p className={`text-lg font-bold tabular-nums ${scoreColor}`}>{globalScore}</p>
        </div>
        <div className="text-center">
          <p className="text-[0.625rem] text-muted-foreground">Verdict</p>
          <p className={`text-xs font-bold ${verdictColor}`}>{verdict}</p>
        </div>
        <div className="text-center">
          <p className="text-[0.625rem] text-muted-foreground">Agents</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{aliveAgents}</p>
        </div>
      </div>
      {Object.keys(engineStatuses).length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(engineStatuses).map(([engine, status]) => (
            <div key={engine} className="flex items-center justify-between px-2 py-1 rounded-lg bg-muted/50">
              <span className="text-[0.625rem] text-muted-foreground truncate">{engine.replace(/-/g, " ")}</span>
              <HealthBadge status={status === "healthy" ? "healthy" : status === "degraded" ? "degraded" : "down"} />
            </div>
          ))}
        </div>
      )}
      {brainStatus.open_circuit_breakers > 0 && (
        <p className="text-[0.625rem] text-red-500 font-medium">
          {brainStatus.open_circuit_breakers} circuit breaker(s) open
        </p>
      )}
      {decision?.created_at && (
        <p className="text-[0.625rem] text-muted-foreground">
          Last decision: {formatRelativeTime(decision.created_at)}
        </p>
      )}
    </div>
  );
}

const AI_AUDIT_ENGINES = [
  "ui_ux", "seo", "technical", "marketplace", "international",
  "conversion", "communication", "security", "brand", "data_quality",
  "analytics", "mobile", "payment", "booking", "content",
];

function EngineHealthScores() {
  const { data: scores } = useQuery({
    queryKey: ["cc-engine-scores"],
    queryFn: async () => {
      const { data: findings } = await db("monitoring_findings")
        .select("source_engine, severity, status")
        .eq("level", 1)
        .order("created_at", { ascending: false })
        .limit(200);

      const engineMap = new Map<string, { score: number; open: number; resolved: number }>();
      for (const engine of AI_AUDIT_ENGINES) {
        engineMap.set(engine, { score: 100, open: 0, resolved: 0 });
      }

      const severityWeights: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };

      for (const f of findings || []) {
        const engine = f.source_engine || "unknown";
        const entry = engineMap.get(engine) || { score: 100, open: 0, resolved: 0 };
        if (f.status === "open" || f.status === "acknowledged") {
          entry.score -= severityWeights[f.severity] || 0;
          entry.open++;
        } else {
          entry.resolved++;
        }
        engineMap.set(engine, entry);
      }

      return [...engineMap.entries()].map(([engine, data]) => ({
        engine,
        score: Math.max(0, data.score),
        open: data.open,
        resolved: data.resolved,
        trend: data.open === 0 ? "stable" : data.open > 3 ? "declining" : "improving",
      }));
    },
    staleTime: 30000,
  });

  if (!scores || scores.length === 0) return null;

  const globalScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Engine Health Scores</h3>
        <span className={`text-lg font-bold tabular-nums ${globalScore >= 80 ? "text-green-500" : globalScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
          {globalScore}/100
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {scores.map((s) => (
          <div key={s.engine} className="rounded-xl border border-border/20 bg-card p-2 text-center">
            <p className="text-[0.625rem] text-muted-foreground truncate">{s.engine.replace(/_/g, " ")}</p>
            <p className={`text-sm font-bold tabular-nums ${s.score >= 80 ? "text-green-500" : s.score >= 60 ? "text-amber-500" : "text-red-500"}`}>
              {s.score}
            </p>
            <p className="text-[0.5625rem] text-muted-foreground">
              {s.trend === "declining" ? "↓" : s.trend === "improving" ? "↑" : "→"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformHealthIndicators() {
  const { data: health } = useQuery({
    queryKey: ["cc-platform-health"],
    queryFn: async () => {
      const { data } = await db("system_health_snapshots")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(20);

      const latestByComponent = new Map<string, { status: string; response_time_ms: number | null; checked_at: string }>();
      for (const snap of data || []) {
        if (!latestByComponent.has(snap.component)) {
          latestByComponent.set(snap.component, {
            status: snap.status,
            response_time_ms: snap.response_time_ms,
            checked_at: snap.checked_at,
          });
        }
      }

      const platformComponents = ["supabase_db", "supabase_auth", "supabase_edge_functions", "vercel_deployment", "supabase_storage"];
      const indicators = platformComponents.map((comp) => {
        const data = latestByComponent.get(comp);
        return {
          component: comp.replace(/_/g, " "),
          status: data?.status || "unknown",
          responseTime: data?.response_time_ms,
          lastChecked: data?.checked_at,
        };
      });

      return indicators;
    },
    staleTime: 30000,
  });

  if (!health) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Platform Services</h3>
      <div className="grid grid-cols-1 gap-2">
        {health.map((indicator) => (
          <div key={indicator.component} className="flex items-center justify-between rounded-xl border border-border/20 bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${indicator.status === "healthy" ? "bg-green-500" : indicator.status === "degraded" ? "bg-amber-500" : indicator.status === "down" ? "bg-red-500" : "bg-gray-400"}`} />
              <span className="text-xs text-foreground capitalize">{indicator.component}</span>
            </div>
            <div className="flex items-center gap-2">
              {indicator.responseTime && (
                <span className="text-[0.625rem] text-muted-foreground tabular-nums">{indicator.responseTime}ms</span>
              )}
              <HealthBadge status={indicator.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivityFeed() {
  const { data: activity, isLoading } = useQuery({
    queryKey: ["cc-recent-activity"],
    queryFn: async () => {
      const { data } = await db("command_audit_log").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    staleTime: 15000,
  });

  if (isLoading) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
      {activity?.map((log: Record<string, unknown>) => (
        <div key={log.id as string} className="flex items-start gap-2 py-2 border-b border-border/10 last:border-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${actorColor(log.actor_type as string)}`} />
          <div className="min-w-0">
            <p className="text-xs text-foreground truncate">{log.action as string}</p>
            <p className="text-[0.625rem] text-muted-foreground">{formatRelativeTime(log.created_at as string)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function actorColor(actor: string): string {
  switch (actor) {
    case "agent": return "bg-blue-500";
    case "human": return "bg-green-500";
    case "cron": return "bg-amber-500";
    default: return "bg-gray-400";
  }
}

type ExecStatusFilter =
  | ""
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
type ExecRiskFilter = "" | "SAFE" | "MEDIUM" | "CRITICAL";

const EXEC_STATUSES: { id: ExecStatusFilter; label: string }[] = [
  { id: "", label: "All" },
  { id: "pending_review", label: "Pending Review" },
  { id: "queued", label: "Queued" },
  { id: "running", label: "Running" },
  { id: "succeeded", label: "Succeeded" },
  { id: "blocked", label: "Blocked" },
  { id: "failed", label: "Failed" },
  { id: "rolled_back", label: "Rolled Back" },
  { id: "cancelled", label: "Cancelled" },
];

const EXEC_RISKS: { id: ExecRiskFilter; label: string }[] = [
  { id: "", label: "All" },
  { id: "SAFE", label: "Safe" },
  { id: "MEDIUM", label: "Medium" },
  { id: "CRITICAL", label: "Critical" },
];

function ExecutionTab() {
  const [statusFilter, setStatusFilter] = useState<ExecStatusFilter>("");
  const [riskFilter, setRiskFilter] = useState<ExecRiskFilter>("");

  const { data: tasks, isLoading, error, dataUpdatedAt } = useQuery({
    // Live status: refetch every 5s so admins see status transitions without
    // a manual reload. RLS already restricts SELECT to admins.
    queryKey: ["cc-execution-tasks", statusFilter, riskFilter],
    queryFn: () =>
      dashboardRepo.fetchExecutionTasks({
        status: statusFilter || undefined,
        riskLevel: riskFilter || undefined,
        limit: 50,
      }),
    refetchInterval: 5000,
    staleTime: 2000,
  });

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/20 bg-card p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Status</span>
          {EXEC_STATUSES.map((s) => (
            <button
              key={s.id || "all"}
              onClick={() => setStatusFilter(s.id)}
              className={`px-2 py-1 rounded-lg text-[0.625rem] font-medium ${
                statusFilter === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">Risk</span>
          {EXEC_RISKS.map((r) => (
            <button
              key={r.id || "all"}
              onClick={() => setRiskFilter(r.id)}
              className={`px-2 py-1 rounded-lg text-[0.625rem] font-medium ${
                riskFilter === r.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-[0.625rem] text-muted-foreground">
          Live · refreshed every 5s · last update {dataUpdatedAt ? formatRelativeTime(new Date(dataUpdatedAt).toISOString()) : "—"}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          {(error as Error).message}
        </div>
      )}

      {isLoading && <LoadingSkeleton count={4} />}

      {!isLoading && (!tasks || tasks.length === 0) && (
        <EmptyState message="No execution tasks match the current filters" />
      )}

      {tasks?.map((t) => {
        const row = t as Record<string, unknown>;
        const status = row.status as string;
        const risk = row.risk_level as string;
        const blockedReason = row.blocked_reason as string | null;
        return (
          <div key={row.id as string} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground truncate">{row.type as string}</span>
              <ExecStatusBadge status={status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <ExecRiskBadge risk={risk} />
              <span className="text-[0.625rem] text-muted-foreground">domain: {row.domain as string}</span>
              <span className="text-[0.625rem] text-muted-foreground">by {row.requested_by as string}</span>
            </div>
            {blockedReason && (
              <p className="text-[0.625rem] text-red-600 dark:text-red-400 mb-2 break-words">
                {blockedReason}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-[0.625rem] text-muted-foreground">
              <span>attempt {row.attempt_count as number}/{row.max_attempts as number}</span>
              {row.approved_by && <span>approved by {row.approved_by as string}</span>}
              {row.idempotency_key && (
                <span className="font-mono truncate max-w-[180px]" title={row.idempotency_key as string}>
                  key: {row.idempotency_key as string}
                </span>
              )}
              <span>{formatRelativeTime(row.created_at as string)}</span>
            </div>
          </div>
        );
      })}

      <p className="text-[0.625rem] text-muted-foreground text-center pt-2">
        Phase-1 safety: CRITICAL tasks are always blocked at the database layer. Visibility is admin-only via row-level security.
      </p>
    </div>
  );
}

function ExecStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    rejected: "bg-zinc-200 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300",
    queued: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    succeeded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    rolled_back: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    cancelled: "bg-zinc-200 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300",
  };
  return (
    <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${colors[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function ExecRiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    SAFE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    CRITICAL: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };
  return (
    <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${colors[risk] || "bg-muted text-muted-foreground"}`}>
      {risk}
    </span>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-green-500",
    amber: "text-amber-500",
    red: "text-red-500",
  };
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[0.6875rem] text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${colorMap[color] || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    expired: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    open: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    acknowledged: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dismissed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${colors[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    critical: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };
  return (
    <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${colors[risk] || "bg-muted text-muted-foreground"}`}>
      {risk} risk
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    info: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${colors[severity] || "bg-muted text-muted-foreground"}`}>
      {severity}
    </span>
  );
}

function HealthBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    degraded: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    down: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    unknown: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${colors[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
