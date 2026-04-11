import type { IncidentResponseAction, OmegaEngineStatus } from "../omega-types";
import type { SentinelSeverity } from "../../sentinel/types";
import { omegaPersistence } from "../omega-persistence";

const MAX_ACTIONS = 1_000;
let actionIdCounter = 0;

const SAFE_MITIGATIONS = new Set([
  "disable_expired_banner", "stop_bad_cron", "isolate_noisy_engine",
  "rollback_safe_config_flag", "invalidate_broken_cache", "requeue_failed_safe_workflow",
  "switch_to_lighter_path", "close_broken_rollout_lane", "rerun_audit",
  "recalculate_score", "mark_entity_incomplete", "republish_sitemap",
  "reindex_taxonomy", "regenerate_thumbnail", "open_auto_incident",
]);

const UNSAFE_MITIGATIONS = new Set([
  "mutation_payment_critical", "schema_rewrite_live", "forced_truth_ownership_change",
  "broad_data_rewrite", "destructive_merge", "critical_state_machine_rewrite",
  "domain_fusion", "workflow_critical_rewrite",
]);

class IncidentResponseEngine {
  readonly name = "omega-incident-response";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private actions = new Map<string, IncidentResponseAction>();

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  detect(
    incidentId: string,
    severity: SentinelSeverity,
    category: string,
    impactedDomains: string[],
    correlatedChanges: string[],
  ): IncidentResponseAction {
    if (this.actions.size >= MAX_ACTIONS) {
      const oldest = [...this.actions.entries()].sort((a, b) => a[1].created_at - b[1].created_at)[0];
      if (oldest) this.actions.delete(oldest[0]);
    }
    const action: IncidentResponseAction = {
      action_id: `ira_${++actionIdCounter}`,
      incident_id: incidentId,
      severity,
      category,
      impacted_domains: impactedDomains,
      correlated_changes: correlatedChanges,
      mitigation_type: "safe",
      mitigation_action: "",
      status: "detected",
      created_at: Date.now(),
    };
    this.actions.set(action.action_id, action);
    this.lastRunAt = Date.now();
    omegaPersistence.writeIncidentAction(action).catch(() => {});
    return action;
  }

  classify(actionId: string): IncidentResponseAction | null {
    const action = this.actions.get(actionId);
    if (!action || action.status !== "detected") return null;
    action.status = "classified";

    const mitigation = this.determineMitigation(action.category, action.severity);
    action.mitigation_action = mitigation.action;
    action.mitigation_type = mitigation.type;
    return action;
  }

  private determineMitigation(category: string, severity: SentinelSeverity): { action: string; type: "safe" | "unsafe" } {
    const categoryMitigations: Record<string, string> = {
      "banner_expired": "disable_expired_banner",
      "cron_failure": "stop_bad_cron",
      "engine_noisy": "isolate_noisy_engine",
      "config_drift": "rollback_safe_config_flag",
      "cache_corruption": "invalidate_broken_cache",
      "workflow_failure": "requeue_failed_safe_workflow",
      "performance_degradation": "switch_to_lighter_path",
      "rollout_failure": "close_broken_rollout_lane",
      "audit_failure": "rerun_audit",
      "score_drift": "recalculate_score",
      "incomplete_entity": "mark_entity_incomplete",
      "sitemap_stale": "republish_sitemap",
      "taxonomy_drift": "reindex_taxonomy",
      "thumbnail_broken": "regenerate_thumbnail",
      "payment_inconsistency": "mutation_payment_critical",
      "schema_corruption": "schema_rewrite_live",
      "truth_conflict": "forced_truth_ownership_change",
    };

    const action = categoryMitigations[category] || "open_auto_incident";
    const isSafe = SAFE_MITIGATIONS.has(action);

    if (severity === "critical" && !isSafe) {
      return { action, type: "unsafe" };
    }

    return { action, type: isSafe ? "safe" : "unsafe" };
  }

  mitigate(actionId: string): IncidentResponseAction | null {
    const action = this.actions.get(actionId);
    if (!action || action.status !== "classified") return null;

    if (action.mitigation_type === "unsafe") {
      action.status = "escalated";
      return action;
    }

    action.status = "mitigating";
    action.status = "re_auditing";
    return action;
  }

  resolve(actionId: string, reAuditRef?: string): IncidentResponseAction | null {
    const action = this.actions.get(actionId);
    if (!action) return null;
    action.status = "resolved";
    action.re_audit_ref = reAuditRef;
    return action;
  }

  escalate(actionId: string): IncidentResponseAction | null {
    const action = this.actions.get(actionId);
    if (!action) return null;
    action.status = "escalated";
    return action;
  }

  getActiveIncidents(): IncidentResponseAction[] {
    return [...this.actions.values()]
      .filter((a) => a.status !== "resolved" && a.status !== "escalated")
      .sort((a, b) => {
        const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return (sevOrder[a.severity] || 4) - (sevOrder[b.severity] || 4);
      });
  }

  getEscalated(): IncidentResponseAction[] {
    return [...this.actions.values()].filter((a) => a.status === "escalated");
  }

  getResolved(): IncidentResponseAction[] {
    return [...this.actions.values()].filter((a) => a.status === "resolved");
  }

  isSafeMitigation(action: string): boolean { return SAFE_MITIGATIONS.has(action); }
  isUnsafeMitigation(action: string): boolean { return UNSAFE_MITIGATIONS.has(action); }

  getStats() {
    const statusCounts: Record<string, number> = {};
    const sevCounts: Record<string, number> = {};
    for (const [, a] of this.actions) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      sevCounts[a.severity] = (sevCounts[a.severity] || 0) + 1;
    }
    return {
      total_actions: this.actions.size,
      by_status: statusCounts,
      by_severity: sevCounts,
      active: this.getActiveIncidents().length,
      escalated: this.getEscalated().length,
    };
  }

  boot(): void {
    this.status = "active";
    this.lastRunAt = Date.now();
    console.log(`[OMEGA] IncidentResponseEngine booted | actions: ${this.actions.size}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const incidentResponseEngine = new IncidentResponseEngine();
