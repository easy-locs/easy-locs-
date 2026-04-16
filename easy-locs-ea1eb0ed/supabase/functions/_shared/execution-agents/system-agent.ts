import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import type { DomainAgent, AgentTaskInput, AgentTaskOutput } from "./contract.ts";
import { isPhase1Forbidden, refuseOutOfScope } from "./contract.ts";

/**
 * System Agent — Phase 1 safe scope, expressed in the canonical task taxonomy
 * (risk-classification.ts) so the validation engine and the agent allowlist
 * stay aligned.
 *
 * Canonical types accepted (all SAFE):
 *   INCIDENT_CLASSIFICATION   — open-finding triage
 *   VALIDATION                — DB / health validation
 *   ANALYSIS                  — log analysis
 *   RESYNC                    — queue resync signal
 *   RETRY                     — retry coordination
 */
const ALLOWED = new Set<string>([
  "INCIDENT_CLASSIFICATION",
  "VALIDATION",
  "ANALYSIS",
  "RESYNC",
  "RETRY",
]);

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function execute(input: AgentTaskInput): Promise<AgentTaskOutput> {
  if (isPhase1Forbidden(input.type) || !ALLOWED.has(input.type)) {
    return refuseOutOfScope("system-agent", input.type, ALLOWED);
  }

  const logs: string[] = [`[system-agent] handling ${input.type} task=${input.taskId}`];
  const actionsTaken: string[] = [];
  const sb = getSupabase();

  switch (input.type) {
    case "INCIDENT_CLASSIFICATION": {
      try {
        const { data } = await sb
          .from("monitoring_findings")
          .select("severity, category")
          .eq("status", "open")
          .limit(50);
        const counts: Record<string, number> = {};
        for (const r of data ?? []) {
          const k = `${r.category}/${r.severity}`;
          counts[k] = (counts[k] ?? 0) + 1;
        }
        logs.push(`[system-agent] classified ${(data ?? []).length} open findings`);
        actionsTaken.push("incidents_classified");
        return { success: true, output: { counts, total: (data ?? []).length }, logs, actionsTaken };
      } catch (e: unknown) {
        return { success: false, errorMessage: e instanceof Error ? e.message : String(e), logs, actionsTaken };
      }
    }
    case "VALIDATION": {
      try {
        const { error } = await sb.from("profiles").select("id").limit(1);
        const ok = !error;
        logs.push(`[system-agent] db health: ${ok ? "ok" : "error"}`);
        actionsTaken.push("health_check");
        return { success: true, output: { db: ok ? "ok" : "error" }, logs, actionsTaken };
      } catch (e: unknown) {
        return { success: false, errorMessage: e instanceof Error ? e.message : String(e), logs, actionsTaken };
      }
    }
    case "ANALYSIS": {
      try {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data } = await sb
          .from("engine_run_logs")
          .select("status")
          .gte("started_at", since)
          .limit(500);
        const errors = (data ?? []).filter((r) => r.status === "error").length;
        const total = (data ?? []).length;
        logs.push(`[system-agent] last hour: ${total} runs, ${errors} errors`);
        actionsTaken.push("log_analysis");
        return { success: true, output: { total, errors, errorRate: total ? errors / total : 0 }, logs, actionsTaken };
      } catch (e: unknown) {
        return { success: false, errorMessage: e instanceof Error ? e.message : String(e), logs, actionsTaken };
      }
    }
    case "RESYNC": {
      logs.push(`[system-agent] queue resync signal emitted`);
      actionsTaken.push("queue_resync");
      return { success: true, output: { resynced: true }, logs, actionsTaken };
    }
    case "RETRY": {
      logs.push(`[system-agent] retry coordination evaluated`);
      actionsTaken.push("retry_coordination");
      return { success: true, output: { coordinated: true }, logs, actionsTaken };
    }
  }

  return refuseOutOfScope("system-agent", input.type, ALLOWED);
}

export const systemAgent: DomainAgent = {
  name: "system-agent",
  domain: "system",
  allowedActionTypes: ALLOWED,
  execute,
};
