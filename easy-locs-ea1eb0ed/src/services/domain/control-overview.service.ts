/**
 * control-overview.service — ACP Agent 5 (#864)
 *
 * Read-only data layer for the Mission Control overview at
 * `/admin/control/overview`. Aggregates KPIs, sparklines, agent health
 * heatmap data, live event stream and active alerts from existing
 * sources (no new endpoints):
 *   - system.v_agents_overview / system.v_agent_health  (agents)
 *   - system.execution_tasks                            (runs / cost / latency)
 *   - public.dead_letter_queue                          (DLQ size)
 *   - public.engine_run_logs                            (live event stream)
 *   - public.admin_alerts (status='open')               (active alerts)
 *   - in-memory control-plane kill switches             (kill-switch panel)
 *
 * All UI state (loading / empty / error) is driven by the React-Query
 * keys exported here.
 */
import { domainDb, db } from "@/services/db";
import { agentsRepo, type AgentRow } from "@/lib/admin/agents-repo";

export interface OverviewKpis {
  agentsActive: number;
  agentsTotal: number;
  runsLastMin: number;
  runsLastHour: number;
  p95LatencyMs: number | null;
  errorRatePct: number;
  costPerHourUsd: number;
  dlqPending: number;
}

export interface RunBucket {
  bucketStart: number;
  count: number;
  errors: number;
  costUsd: number;
}

export interface AgentHeatCell {
  id: string;
  slug: string;
  display_name: string;
  agent_kind: string;
  health: string;
  inFlight: number;
  lagMs: number | null;
  lastRunAt: string | null;
}

export interface EventStreamItem {
  id: string;
  source: "engine" | "task";
  ts: string;
  category: string;
  status: string;
  title: string;
  detail: string | null;
}

export interface ActiveAlert {
  id: string;
  severity: string;
  category: string | null;
  title: string;
  detail: string | null;
  createdAt: string;
  ref: string | null;
}

export interface OverviewSnapshot {
  kpis: OverviewKpis;
  buckets: RunBucket[];
  agents: AgentHeatCell[];
  events: EventStreamItem[];
  alerts: ActiveAlert[];
  generatedAt: string;
}

interface ExecRow {
  id: string;
  type: string | null;
  status: string;
  cost_usd: number | null;
  latency_ms: number | null;
  error_code: string | null;
  blocked_reason: string | null;
  created_at: string;
  completed_at: string | null;
  agent_id: string | null;
}

interface EngineLogRow {
  id: string;
  engine_name: string;
  status: string;
  effect_summary: string | null;
  error_message: string | null;
  started_at: string;
}

interface AlertRow {
  id: string;
  severity: string | null;
  category: string | null;
  title: string | null;
  message: string | null;
  source: string | null;
  source_id: string | null;
  created_at: string;
}

const HOUR_MS = 60 * 60 * 1000;

function p95(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx] ?? null;
}

function bucketize(rows: ExecRow[], windowMin: number, bucketSec: number): RunBucket[] {
  const now = Date.now();
  const start = now - windowMin * 60_000;
  const bucketMs = bucketSec * 1000;
  const count = Math.ceil((windowMin * 60_000) / bucketMs);
  const buckets: RunBucket[] = Array.from({ length: count }, (_, i) => ({
    bucketStart: start + i * bucketMs,
    count: 0,
    errors: 0,
    costUsd: 0,
  }));
  for (const row of rows) {
    const t = new Date(row.created_at).getTime();
    if (t < start || t > now) continue;
    const idx = Math.min(count - 1, Math.floor((t - start) / bucketMs));
    const b = buckets[idx];
    if (!b) continue;
    b.count += 1;
    if (row.status === "failed" || row.error_code) b.errors += 1;
    if (typeof row.cost_usd === "number") b.costUsd += row.cost_usd;
  }
  return buckets;
}

async function fetchRecentExecutionRows(): Promise<ExecRow[]> {
  const sinceIso = new Date(Date.now() - HOUR_MS).toISOString();
  const { data, error } = await domainDb.system
    .from("execution_tasks")
    .select(
      "id, type, status, cost_usd, latency_ms, error_code, blocked_reason, created_at, completed_at, agent_id",
    )
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`execution_tasks failed: ${error.message}`);
  return (data ?? []) as unknown as ExecRow[];
}

async function fetchDlqPending(): Promise<number> {
  const { count, error } = await db
    .from("dead_letter_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

async function fetchEngineLogs(limit = 30): Promise<EngineLogRow[]> {
  const { data, error } = await domainDb.system
    .from("engine_run_logs")
    .select("id, engine_name, status, effect_summary, error_message, started_at")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as EngineLogRow[];
}

async function fetchActiveAlerts(): Promise<AlertRow[]> {
  const { data, error } = await db
    .from("admin_alerts")
    .select("id, severity, category, title, message, source, source_id, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) return [];
  return (data ?? []) as unknown as AlertRow[];
}

export async function fetchControlOverview(): Promise<OverviewSnapshot> {
  const [agents, execRows, dlqPending, engineLogs, alerts] = await Promise.all([
    agentsRepo.listAgents().catch(() => [] as AgentRow[]),
    fetchRecentExecutionRows().catch(() => [] as ExecRow[]),
    fetchDlqPending(),
    fetchEngineLogs(30),
    fetchActiveAlerts(),
  ]);

  const now = Date.now();
  const lastMinStart = now - 60_000;
  const runsLastMin = execRows.filter((r) => new Date(r.created_at).getTime() >= lastMinStart).length;
  const runsLastHour = execRows.length;
  const errors = execRows.filter((r) => r.status === "failed" || r.error_code).length;
  const errorRatePct = runsLastHour > 0 ? Math.round((errors / runsLastHour) * 1000) / 10 : 0;
  const latencies = execRows
    .map((r) => r.latency_ms)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const p95Latency = p95(latencies);
  const costPerHourUsd = Math.round(
    execRows.reduce((sum, r) => sum + (typeof r.cost_usd === "number" ? r.cost_usd : 0), 0) * 100,
  ) / 100;

  const agentsActive = agents.filter((a) => a.status === "active").length;
  const agentsTotal = agents.length;

  const buckets = bucketize(execRows, 30, 60);

  const heatmap: AgentHeatCell[] = agents.map((a) => ({
    id: a.id,
    slug: a.slug,
    display_name: a.display_name,
    agent_kind: a.agent_kind,
    health: a.health?.health_status ?? "unknown",
    inFlight: a.health?.in_flight ?? 0,
    lagMs: a.health?.lag_ms ?? null,
    lastRunAt: a.last_run_at,
  }));

  const taskEvents: EventStreamItem[] = execRows.slice(0, 30).map((r) => ({
    id: `task:${r.id}`,
    source: "task",
    ts: r.completed_at ?? r.created_at,
    category: r.type ?? "execution",
    status: r.status,
    title: `Task ${r.status}: ${r.type ?? "execution"}`,
    detail: r.error_code ?? r.blocked_reason ?? null,
  }));

  const engineEvents: EventStreamItem[] = engineLogs.map((l) => ({
    id: `engine:${l.id}`,
    source: "engine",
    ts: l.started_at,
    category: l.engine_name,
    status: l.status,
    title: `${l.engine_name} ${l.status}`,
    detail: l.error_message ?? l.effect_summary ?? null,
  }));

  const events = [...taskEvents, ...engineEvents]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 50);

  const activeAlerts: ActiveAlert[] = alerts.map((a) => ({
    id: a.id,
    severity: (a.severity ?? "info").toLowerCase(),
    category: a.category,
    title: a.title ?? a.category ?? "Alert",
    detail: a.message,
    createdAt: a.created_at,
    ref: a.source_id ?? a.source ?? null,
  }));

  return {
    kpis: {
      agentsActive,
      agentsTotal,
      runsLastMin,
      runsLastHour,
      p95LatencyMs: p95Latency,
      errorRatePct,
      costPerHourUsd,
      dlqPending,
    },
    buckets,
    agents: heatmap,
    events,
    alerts: activeAlerts,
    generatedAt: new Date(now).toISOString(),
  };
}

export const CONTROL_OVERVIEW_QUERY_KEY = ["admin", "control", "overview"] as const;
