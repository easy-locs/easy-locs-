import type { CodeEvolutionSuggestion, OmegaEngineStatus } from "../omega-types";
import { omegaPersistence } from "../omega-persistence";

const MAX_SUGGESTIONS = 500;
let suggIdCounter = 0;

type IssueType = CodeEvolutionSuggestion["issue_type"];

const SAFE_ACTIONS = new Set<IssueType>([
  "unused_module", "dead_branch", "stale_utility", "render_waste",
  "missing_guard", "duplication",
]);

class CodeEvolutionEngine {
  readonly name = "omega-code-evolution";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private suggestions = new Map<string, CodeEvolutionSuggestion>();

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  suggest(
    targetFile: string,
    domain: string,
    issueType: IssueType,
    description: string,
    riskLevel: "low" | "medium" | "high",
    impactEstimate: number,
    affectedDomains: string[],
  ): CodeEvolutionSuggestion {
    if (this.suggestions.size >= MAX_SUGGESTIONS) {
      const lowest = [...this.suggestions.entries()].sort((a, b) => a[1].impact_estimate - b[1].impact_estimate)[0];
      if (lowest) this.suggestions.delete(lowest[0]);
    }
    const suggestion: CodeEvolutionSuggestion = {
      suggestion_id: `evo_${++suggIdCounter}`,
      target_file: targetFile,
      domain,
      issue_type: issueType,
      description,
      risk_level: riskLevel,
      impact_estimate: impactEstimate,
      safe_action: SAFE_ACTIONS.has(issueType) && riskLevel === "low",
      affected_domains: affectedDomains,
      status: "proposed",
      created_at: Date.now(),
    };
    this.suggestions.set(suggestion.suggestion_id, suggestion);
    this.lastRunAt = Date.now();
    omegaPersistence.writeCodeSuggestion(suggestion).catch(() => {});
    return suggestion;
  }

  approve(suggestionId: string): boolean {
    const s = this.suggestions.get(suggestionId);
    if (!s || s.status !== "proposed") return false;
    s.status = "approved";
    return true;
  }

  apply(suggestionId: string): boolean {
    const s = this.suggestions.get(suggestionId);
    if (!s || s.status !== "approved") return false;
    s.status = "applied";
    return true;
  }

  reject(suggestionId: string): boolean {
    const s = this.suggestions.get(suggestionId);
    if (!s || s.status !== "proposed") return false;
    s.status = "rejected";
    return true;
  }

  getSafeActions(): CodeEvolutionSuggestion[] {
    return [...this.suggestions.values()]
      .filter((s) => s.safe_action && s.status === "proposed")
      .sort((a, b) => b.impact_estimate - a.impact_estimate);
  }

  getByDomain(domain: string): CodeEvolutionSuggestion[] {
    return [...this.suggestions.values()].filter((s) => s.domain === domain || s.affected_domains.includes(domain));
  }

  getByIssueType(type: IssueType): CodeEvolutionSuggestion[] {
    return [...this.suggestions.values()].filter((s) => s.issue_type === type);
  }

  getTechDebtScore(): number {
    const active = [...this.suggestions.values()].filter((s) => s.status === "proposed" || s.status === "approved");
    if (active.length === 0) return 100;
    const totalImpact = active.reduce((s, a) => s + a.impact_estimate, 0);
    return Math.max(0, 100 - totalImpact);
  }

  getStats() {
    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    for (const [, s] of this.suggestions) {
      typeCounts[s.issue_type] = (typeCounts[s.issue_type] || 0) + 1;
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    }
    return {
      total_suggestions: this.suggestions.size,
      by_type: typeCounts,
      by_status: statusCounts,
      safe_actionable: this.getSafeActions().length,
      tech_debt_score: this.getTechDebtScore(),
    };
  }

  boot(): void {
    this.status = "active";
    this.lastRunAt = Date.now();
    console.log(`[OMEGA] CodeEvolutionEngine booted | suggestions: ${this.suggestions.size}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const codeEvolutionEngine = new CodeEvolutionEngine();
