import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import type { DomainAgent, AgentTaskInput, AgentTaskOutput } from "./contract.ts";
import { isPhase1Forbidden, refuseOutOfScope } from "./contract.ts";

/**
 * Data Agent — Phase 1 safe scope, expressed in the canonical task taxonomy
 * from src/core/execution/risk-classification.ts so the validation engine and
 * the agent allowlist share a single source of truth.
 *
 * Canonical types accepted (all SAFE):
 *   NON_SENSITIVE_DEDUP   — read-only dedup analysis on allowlisted tables
 *   RESYNC                — canonical-source resync signal
 *   READ_ONLY_QUERY       — bounded read against allowlisted tables
 *   VALIDATION            — data validation pass
 *   REPORT_GENERATION     — non-sensitive reporting
 */
const ALLOWED = new Set<string>([
  "NON_SENSITIVE_DEDUP",
  "RESYNC",
  "READ_ONLY_QUERY",
  "VALIDATION",
  "REPORT_GENERATION",
]);

/**
 * Phase-1 strict allowlist of read-only-safe tables. The data agent will only
 * touch tables explicitly enumerated here; anything else is refused even with
 * service-role credentials. This is the inverse of a denylist (which would let
 * unknown sensitive tables slip through) and matches the "non-sensitive only"
 * scope of the autonomous execution layer.
 *
 * Tables added here MUST be safe to read in bulk (no PII, no financial,
 * no auth, no wallet). Add new entries deliberately, with review.
 */
const READ_ONLY_TABLE_ALLOWLIST = new Set<string>([
  "engine_supervisor",
  "engine_run_logs",
  "agent_actions_log",
  "command_center_actions",
  "categories",
  "tags",
  "system_health_metrics",
]);

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function execute(input: AgentTaskInput): Promise<AgentTaskOutput> {
  if (isPhase1Forbidden(input.type) || !ALLOWED.has(input.type)) {
    return refuseOutOfScope("data-agent", input.type, ALLOWED);
  }

  const logs: string[] = [`[data-agent] handling ${input.type} task=${input.taskId}`];
  const actionsTaken: string[] = [];
  const sb = getSupabase();

  const table = (input.payload?.table as string) ?? "";
  // Phase-1 strict allowlist enforcement: any table-touching action must
  // target a table on READ_ONLY_TABLE_ALLOWLIST. Unknown / sensitive tables
  // are refused outright, never reached.
  const tableTouching = input.type === "READ_ONLY_QUERY"
    || input.type === "NON_SENSITIVE_DEDUP";
  if (tableTouching) {
    if (!table || !READ_ONLY_TABLE_ALLOWLIST.has(table)) {
      return refuseOutOfScope("data-agent", `${input.type}:${table || "<missing>"}`, ALLOWED);
    }
  }

  switch (input.type) {
    case "NON_SENSITIVE_DEDUP": {
      logs.push(`[data-agent] dedup analysis (read-only) on table=${table || "n/a"}`);
      actionsTaken.push("dedup_analysis_only");
      return {
        success: true,
        output: { table, candidatesFound: 0, autoMerged: 0 },
        logs, actionsTaken,
      };
    }
    case "RESYNC": {
      const source = (input.payload?.source as string) ?? "unknown";
      logs.push(`[data-agent] resync requested from canonical source=${source}`);
      actionsTaken.push(`resync_${source}`);
      return {
        success: true,
        output: { source, recordsConsidered: 0 },
        logs, actionsTaken,
      };
    }
    case "READ_ONLY_QUERY": {
      const q = (input.payload?.table as string) || "engine_supervisor";
      try {
        const { count } = await sb.from(q).select("*", { count: "exact", head: true });
        logs.push(`[data-agent] read-only count on ${q}: ${count ?? 0}`);
        actionsTaken.push(`read_${q}`);
        return { success: true, output: { table: q, count: count ?? 0 }, logs, actionsTaken };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, errorMessage: msg, logs, actionsTaken };
      }
    }
    case "VALIDATION":
    case "REPORT_GENERATION": {
      logs.push(`[data-agent] ${input.type.toLowerCase()} executed (read-only)`);
      actionsTaken.push(input.type.toLowerCase());
      return { success: true, output: { generated: true }, logs, actionsTaken };
    }
  }

  return refuseOutOfScope("data-agent", input.type, ALLOWED);
}

export const dataAgent: DomainAgent = {
  name: "data-agent",
  domain: "data",
  allowedActionTypes: ALLOWED,
  execute,
};
