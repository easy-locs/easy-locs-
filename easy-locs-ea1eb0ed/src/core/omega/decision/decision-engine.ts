import type { DecisionInput, DecisionOutput, OmegaDecision, OmegaEngineStatus } from "../omega-types";

const MAX_DECISIONS = 2_000;
let decisionIdCounter = 0;

const SEVERITY_WEIGHTS: Record<string, number> = { critical: 10, high: 7, medium: 4, low: 1, info: 0 };
const CRITICALITY_WEIGHTS: Record<string, number> = { critical: 10, high: 7, medium: 4, low: 1 };

class DecisionEngine {
  readonly name = "omega-decision";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private decisions: DecisionOutput[] = [];

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  decide(input: DecisionInput, targetType: string, targetId: string): DecisionOutput {
    const sevWeight = SEVERITY_WEIGHTS[input.incident_severity] || 0;
    const critWeight = CRITICALITY_WEIGHTS[input.engine_criticality] || 0;

    const urgencyScore =
      sevWeight * 3 +
      critWeight * 2 +
      input.user_impact * 2 +
      input.business_impact * 2 +
      input.performance_impact * 1.5 +
      input.revenue_impact * 2 +
      input.dependency_reach * 1 +
      input.regression_risk * 1.5;

    const normalizedUrgency = Math.min(urgencyScore / 100, 1);

    let decision: OmegaDecision;
    let reasoning: string;
    const actions: string[] = [];

    if (input.incident_severity === "critical" && input.audit_status === "fail") {
      decision = "BLOCK_NOW";
      reasoning = "Critical severity with failing audit — immediate block required";
      actions.push("block_release", "open_incident", "notify_team");
    } else if (input.release_status === "blocked") {
      decision = "BLOCK_NOW";
      reasoning = "Release is blocked — cannot proceed";
      actions.push("investigate_blocker", "run_audit");
    } else if (sevWeight >= 7 && input.regression_risk > 7) {
      decision = "REJECT_CHANGE";
      reasoning = `High severity (${input.incident_severity}) with high regression risk (${input.regression_risk})`;
      actions.push("rollback", "run_regression_tests");
    } else if (input.incident_severity === "critical") {
      decision = "FIX_NOW";
      reasoning = "Critical severity requires immediate fix";
      actions.push("identify_root_cause", "apply_fix", "re_audit");
    } else if (normalizedUrgency > 0.7 && input.confidence_score > 0.8) {
      decision = "FIX_NOW";
      reasoning = `High urgency (${(normalizedUrgency * 100).toFixed(0)}%) with high confidence`;
      actions.push("apply_targeted_fix", "validate", "re_audit");
    } else if (normalizedUrgency > 0.5 && input.policy_severity !== "critical") {
      if (input.regression_risk < 3) {
        decision = "SAFE_AUTO_HEAL";
        reasoning = "Moderate urgency with low regression risk — safe auto-heal";
        actions.push("auto_heal", "validate_outcome", "re_audit");
      } else {
        decision = "ESCALATE";
        reasoning = "Moderate urgency but regression risk requires human review";
        actions.push("notify_team", "prepare_options");
      }
    } else if (input.regression_risk > 5 && input.confidence_score < 0.7) {
      decision = "REQUIRE_HUMAN_REVIEW";
      reasoning = "Risk too high for automated action with moderate confidence";
      actions.push("queue_for_review", "prepare_analysis");
    } else if (normalizedUrgency > 0.3) {
      decision = "OPTIMIZE_NEXT";
      reasoning = "Notable issue to address in next optimization cycle";
      actions.push("add_to_queue", "schedule_fix");
    } else if (input.confidence_score < 0.5) {
      decision = "OBSERVE";
      reasoning = "Low confidence — continue observing before acting";
      actions.push("add_monitoring", "schedule_recheck");
    } else if (normalizedUrgency <= 0.1) {
      decision = "DEFER";
      reasoning = "Low urgency — defer to later";
      actions.push("add_to_backlog");
    } else {
      decision = "ROLLOUT_GRADUALLY";
      reasoning = "Safe to proceed with gradual rollout";
      actions.push("staged_rollout", "monitor_metrics");
    }

    const output: DecisionOutput = {
      decision_id: `dec_${++decisionIdCounter}`,
      decision,
      priority: this.decisionToPriority(decision),
      confidence: input.confidence_score,
      reasoning,
      target_type: targetType,
      target_id: targetId,
      recommended_actions: actions,
      created_at: Date.now(),
    };

    this.decisions.push(output);
    if (this.decisions.length > MAX_DECISIONS) {
      this.decisions = this.decisions.slice(-MAX_DECISIONS);
    }

    this.lastRunAt = Date.now();
    return output;
  }

  private decisionToPriority(d: OmegaDecision): "now" | "next" | "later" | "observe" | "ignore" {
    switch (d) {
      case "BLOCK_NOW": case "FIX_NOW": return "now";
      case "SAFE_AUTO_HEAL": case "ESCALATE": case "REJECT_CHANGE": return "next";
      case "OPTIMIZE_NEXT": case "ROLLOUT_GRADUALLY": return "later";
      case "OBSERVE": case "REQUIRE_HUMAN_REVIEW": return "observe";
      case "DEFER": return "ignore";
    }
  }

  getRecentDecisions(limit = 50): DecisionOutput[] {
    return this.decisions.slice(-limit);
  }

  getDecisionsByType(decision: OmegaDecision): DecisionOutput[] {
    return this.decisions.filter((d) => d.decision === decision);
  }

  getStats() {
    const counts: Record<string, number> = {};
    for (const d of this.decisions) {
      counts[d.decision] = (counts[d.decision] || 0) + 1;
    }
    return { total_decisions: this.decisions.length, by_type: counts };
  }

  boot(): void {
    this.status = "active";
    this.lastRunAt = Date.now();
    console.log(`[OMEGA] DecisionEngine booted | decisions: ${this.decisions.length}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const decisionEngine = new DecisionEngine();
