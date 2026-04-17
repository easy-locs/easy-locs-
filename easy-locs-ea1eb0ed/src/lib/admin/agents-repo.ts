/**
 * agents-repo — Sovereign Agent Control · L4 (#813)
 *
 * Read+control surface for the /admin/agents cockpit. Reads come from
 * the L1/L2 views (`system.v_agents_overview`, `system.v_agent_health`)
 * via the standard system schema client; writes always go through the
 * authoritative RPCs registered by L1 (`system.set_agent_status`).
 *
 * No direct UPDATE on `system.agents` from the client — that table is
 * RLS-locked to RPC-only writes.
 */
import { domainDb } from "@/services/db";
import { supabase } from "@/integrations/supabase/client";

/**
 * Typed bridge to `supabase.schema('system').rpc(...)`. The generated
 * Supabase types do not yet include the `system` schema RPCs, so we
 * narrow the call surface here once instead of double-casting at every
 * call site.
 */
type SystemRpc = <T = unknown>(
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: T | null; error: { message: string } | null }>;

function systemRpc(): { rpc: SystemRpc } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.schema("system" as never) as unknown as { rpc: SystemRpc };
}

export type AgentLifecycleStatus = "active" | "disabled" | "canary" | "deprecated";
export type AgentHealthStatus =
  | "healthy"
  | "degraded"
  | "stale"
  | "down"
  | "unknown";

export interface AgentOverviewRow {
  id: string;
  slug: string;
  display_name: string;
  agent_kind: string;
  owner_team: string | null;
  status: AgentLifecycleStatus;
  canary_pct: number | null;
  sla_target_ms: number | null;
  quotas: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  last_health_status: string | null;
  last_health_at: string | null;
  current_version: string | null;
  current_version_released_at: string | null;
  policy_profile_slug: string | null;
  approval_required: boolean | null;
  risk_floor: string | null;
  max_runs_per_min: number | null;
  max_runs_per_day: number | null;
  capabilities: Array<{ domain: string; task_type: string }> | null;
  last_run_task_id: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentHealthRow {
  agent_id: string;
  agent_slug: string;
  display_name: string;
  agent_kind: string;
  lifecycle_status: AgentLifecycleStatus;
  health_status: AgentHealthStatus;
  health_reason: string | null;
  last_seen_at: string | null;
  lag_ms: number | null;
  in_flight: number | null;
  queue_depth: number | null;
  worker_count: number | null;
}

/**
 * Joined row used by the cockpit table — overview + the live health
 * snapshot. We fetch both views and join in JS so the page works even
 * if no heartbeat has been recorded yet (then `health` is null).
 */
export interface AgentRow extends AgentOverviewRow {
  health: AgentHealthRow | null;
}

export interface AgentRunRow {
  id: string;
  type: string;
  domain: string;
  status: string;
  risk_level: string;
  attempt_count: number;
  max_attempts: number;
  error: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentEventRow {
  id: string;
  category: string;
  status: string;
  message: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentFilters {
  kind?: string;
  status?: AgentLifecycleStatus | "";
  health?: AgentHealthStatus | "";
  ownerTeam?: string;
  q?: string;
}

function matches(row: AgentRow, f: AgentFilters): boolean {
  if (f.kind && row.agent_kind !== f.kind) return false;
  if (f.status && row.status !== f.status) return false;
  if (f.health && (row.health?.health_status ?? "unknown") !== f.health) return false;
  if (f.ownerTeam && row.owner_team !== f.ownerTeam) return false;
  if (f.q) {
    const needle = f.q.trim().toLowerCase();
    if (!needle) return true;
    const hay = [
      row.slug,
      row.display_name,
      row.agent_kind,
      row.owner_team ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export const agentsRepo = {
  /**
   * Lists every registered agent joined with its current heartbeat
   * health row. Filters are applied client-side because the queue is
   * always small (dozens, not millions) and the views have no
   * server-side filter args.
   */
  async listAgents(filters: AgentFilters = {}): Promise<AgentRow[]> {
    const [overviewRes, healthRes] = await Promise.all([
      domainDb.system
        .from("v_agents_overview")
        .select("*")
        .order("display_name", { ascending: true }),
      domainDb.system.from("v_agent_health").select("*"),
    ]);
    if (overviewRes.error)
      throw new Error(`listAgents (overview) failed: ${overviewRes.error.message}`);
    if (healthRes.error)
      throw new Error(`listAgents (health) failed: ${healthRes.error.message}`);

    const healthByAgentId = new Map<string, AgentHealthRow>();
    for (const h of (healthRes.data ?? []) as AgentHealthRow[]) {
      healthByAgentId.set(h.agent_id, h);
    }

    const rows: AgentRow[] = ((overviewRes.data ?? []) as AgentOverviewRow[]).map(
      (o) => ({ ...o, health: healthByAgentId.get(o.id) ?? null }),
    );
    return rows.filter((r) => matches(r, filters));
  },

  async getAgent(id: string): Promise<AgentRow | null> {
    const [overviewRes, healthRes] = await Promise.all([
      domainDb.system
        .from("v_agents_overview")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      domainDb.system
        .from("v_agent_health")
        .select("*")
        .eq("agent_id", id)
        .maybeSingle(),
    ]);
    if (overviewRes.error)
      throw new Error(`getAgent (overview) failed: ${overviewRes.error.message}`);
    if (!overviewRes.data) return null;
    return {
      ...(overviewRes.data as AgentOverviewRow),
      health: (healthRes.data as AgentHealthRow | null) ?? null,
    };
  },

  /**
   * Last N execution_tasks attributed to this agent (linked via
   * `execution_tasks.agent_id`). Powers the Runs tab and the table's
   * "Last execution" cell.
   */
  async listAgentRuns(agentId: string, limit = 50): Promise<AgentRunRow[]> {
    const { data, error } = await domainDb.system
      .from("execution_tasks")
      .select(
        "id, type, domain, status, risk_level, attempt_count, max_attempts, error, blocked_reason, created_at, updated_at",
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`listAgentRuns failed: ${error.message}`);
    return (data ?? []) as AgentRunRow[];
  },

  /**
   * Recent canonical events for the agent. Reads from
   * `public.engine_run_logs` filtered on `metadata_json.agent_id`.
   * Returns newest first.
   */
  async listAgentEvents(agentId: string, limit = 50): Promise<AgentEventRow[]> {
    const { data, error } = await supabase
      .from("engine_run_logs")
      .select("id, category, status, message, metadata_json, created_at")
      .filter("metadata_json->>agent_id", "eq", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`listAgentEvents failed: ${error.message}`);
    return (data ?? []) as AgentEventRow[];
  },

  /**
   * Mutations — single source of truth is `system.set_agent_status`,
   * which logs into `agent_command_history` for audit. The RPC enforces
   * the super_admin role at the DB layer.
   */
  async setAgentStatus(input: {
    slug: string;
    status: AgentLifecycleStatus;
    canaryPct?: number | null;
  }) {
    const { data, error } = await systemRpc().rpc("set_agent_status", {
      p_slug: input.slug,
      p_status: input.status,
      p_canary_pct: input.canaryPct ?? null,
    });
    if (error) throw new Error(`setAgentStatus failed: ${error.message}`);
    return data;
  },

  /**
   * LB1 (#815) — Conversation explorer. For domain="ai", reads
   * `system.v_ai_runs` (joins execution_tasks ↔ ai_interactions ↔ agents).
   * For other domains, falls back to `execution_tasks` with the same
   * shape so the UI stays uniform.
   */
  async listAgentRunsRich(
    agentId: string,
    domain: string,
    limit = 100,
  ): Promise<AgentRunRichRow[]> {
    if (domain === "ai") {
      const { data, error } = await domainDb.system
        .from("v_ai_runs")
        .select("*")
        .eq("agent_id", agentId)
        .order("task_created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`listAgentRunsRich(ai) failed: ${error.message}`);
      return ((data ?? []) as AiRunViewRow[]).map((r) => ({
        task_id: r.task_id,
        type: r.task_type,
        status: r.task_status,
        risk_level: r.risk_level ?? "UNKNOWN",
        cost_usd: r.cost_usd,
        latency_ms: r.latency_ms,
        held_for_review: r.held_for_review ?? false,
        held_reason: r.held_reason ?? null,
        released_at: r.released_at ?? null,
        created_at: r.task_created_at,
        prompt: r.prompt ?? null,
        response: r.response ?? null,
        model: r.model ?? null,
        provider: r.provider ?? null,
        error: r.error ?? null,
      }));
    }
    const { data, error } = await domainDb.system
      .from("execution_tasks")
      .select(
        "id, type, status, risk_level, cost_usd, latency_ms, held_for_review, held_reason, released_at, error, blocked_reason, created_at, payload, execution_result",
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`listAgentRunsRich failed: ${error.message}`);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      task_id: r.id as string,
      type: r.type as string,
      status: r.status as string,
      risk_level: (r.risk_level as string) ?? "UNKNOWN",
      cost_usd: (r.cost_usd as number) ?? null,
      latency_ms: (r.latency_ms as number) ?? null,
      held_for_review: (r.held_for_review as boolean) ?? false,
      held_reason: (r.held_reason as string) ?? null,
      released_at: (r.released_at as string) ?? null,
      created_at: r.created_at as string,
      prompt: null,
      response: null,
      model: null,
      provider: null,
      error: ((r.error ?? r.blocked_reason) as string) ?? null,
    }));
  },

  /**
   * Releases a held AI response after admin review. RPC is admin-only.
   */
  async releaseHeldAiResponse(taskId: string, decision: "approved" | "rejected") {
    const { data, error } = await systemRpc().rpc("release_held_ai_response", {
      p_task_id: taskId,
      p_decision: decision,
    });
    if (error) throw new Error(`releaseHeldAiResponse failed: ${error.message}`);
    return data;
  },
};

export interface AgentRunRichRow {
  task_id: string;
  type: string;
  status: string;
  risk_level: string;
  cost_usd: number | null;
  latency_ms: number | null;
  held_for_review: boolean;
  held_reason: string | null;
  released_at: string | null;
  created_at: string;
  prompt: string | null;
  response: string | null;
  model: string | null;
  provider: string | null;
  error: string | null;
}

interface AiRunViewRow {
  task_id: string;
  task_type: string;
  task_status: string;
  task_created_at: string;
  risk_level: string | null;
  cost_usd: number | null;
  latency_ms: number | null;
  held_for_review: boolean | null;
  held_reason: string | null;
  released_at: string | null;
  prompt: string | null;
  response: string | null;
  model: string | null;
  provider: string | null;
  error: string | null;
  agent_id: string;
}

export type AgentsRepo = typeof agentsRepo;
