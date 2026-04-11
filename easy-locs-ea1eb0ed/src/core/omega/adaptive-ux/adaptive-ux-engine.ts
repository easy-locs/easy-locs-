import type { AdaptiveUXRule, AdaptiveUXContext, AdaptiveUXAdaptation, OmegaEngineStatus } from "../omega-types";
import { omegaPersistence } from "../omega-persistence";

const MAX_RULES = 500;
let ruleIdCounter = 0;

type RuleType = AdaptiveUXRule["rule_type"];

class AdaptiveUXEngine {
  readonly name = "omega-adaptive-ux";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private rules = new Map<string, AdaptiveUXRule>();

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  addRule(
    ruleType: RuleType,
    context: AdaptiveUXContext,
    adaptation: AdaptiveUXAdaptation,
    gradual = true,
  ): AdaptiveUXRule {
    if (this.rules.size >= MAX_RULES) {
      const oldest = [...this.rules.entries()].sort((a, b) => a[1].created_at - b[1].created_at)[0];
      if (oldest) this.rules.delete(oldest[0]);
    }
    const rule: AdaptiveUXRule = {
      rule_id: `ux_${++ruleIdCounter}`,
      rule_type: ruleType,
      context,
      adaptation,
      measurable: true,
      reversible: true,
      gradual,
      active: true,
      created_at: Date.now(),
    };
    this.rules.set(rule.rule_id, rule);
    this.lastRunAt = Date.now();
    omegaPersistence.writeAdaptiveRule(rule).catch(() => {});
    return rule;
  }

  deactivateRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.active = false;
    return true;
  }

  activateRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.active = true;
    return true;
  }

  getActiveRules(): AdaptiveUXRule[] {
    return [...this.rules.values()].filter((r) => r.active);
  }

  getRulesByType(type: RuleType): AdaptiveUXRule[] {
    return [...this.rules.values()].filter((r) => r.rule_type === type);
  }

  adaptCardOrder(pageContext: string, userRole: string, timeOfDay: string): AdaptiveUXRule {
    return this.addRule("card_reorder", { page: pageContext, role: userRole, time: timeOfDay },
      { strategy: "relevance_weighted", factors: ["recency", "role_match", "time_relevance", "engagement_history"] });
  }

  adaptDashboard(userRole: string, topModules: string[]): AdaptiveUXRule {
    return this.addRule("dashboard_adapt", { role: userRole },
      { visible_modules: topModules, layout: userRole === "provider" ? "operations_first" : "discovery_first" });
  }

  adaptSearchRanking(context: AdaptiveUXContext): AdaptiveUXRule {
    return this.addRule("search_ranking", context,
      { boost_factors: ["geo_proximity", "quality_score", "availability", "media_quality", "trust_score"], decay: "time_weighted" });
  }

  adaptPreloadStrategy(pagePath: string, userBehavior: string): AdaptiveUXRule {
    return this.addRule("preload_strategy", { page: pagePath, behavior: userBehavior },
      { preload: userBehavior === "browser" ? ["next_page", "related_listings"] : ["checkout", "payment"], lazy: ["below_fold", "secondary_media"] });
  }

  getStats() {
    const typeCounts: Record<string, number> = {};
    let active = 0;
    for (const [, r] of this.rules) {
      typeCounts[r.rule_type] = (typeCounts[r.rule_type] || 0) + 1;
      if (r.active) active++;
    }
    return { total_rules: this.rules.size, active_rules: active, by_type: typeCounts };
  }

  boot(): void {
    this.status = "active";
    this.lastRunAt = Date.now();
    console.log(`[OMEGA] AdaptiveUXEngine booted | rules: ${this.rules.size}`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const adaptiveUXEngine = new AdaptiveUXEngine();
