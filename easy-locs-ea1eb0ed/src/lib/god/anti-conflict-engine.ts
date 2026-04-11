import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";
import { taxonomyGodEngine } from "./taxonomy-god-engine";
import { stateMachineEngine } from "./state-machines";
import { contentGraph } from "./canonical-content-graph";

export type ConflictSeverity = "low" | "medium" | "high" | "critical";
export type ConflictMode = "PREVENT" | "DETECT" | "SCORE" | "BLOCK" | "AUTO_FIX" | "RE_AUDIT" | "RELEASE";

export interface ConflictReport {
  id: string;
  type: string;
  severity: ConflictSeverity;
  description: string;
  source_a: string;
  source_b: string;
  domain: string;
  auto_fixable: boolean;
  suggested_fix?: string;
  linked_files: string[];
  detected_at: number;
  resolved: boolean;
  resolved_at?: number;
}

export interface ConflictScanResult {
  timestamp: number;
  total_conflicts: number;
  blocking_conflicts: number;
  auto_fixable_conflicts: number;
  human_review_needed: number;
  severity_score: number;
  conflicts: ConflictReport[];
  mode: ConflictMode;
}

const SOURCE_OF_TRUTH: Record<string, string> = {
  taxonomy: "src/lib/taxonomy/category-tree.ts",
  canonical_types: "src/domains/shared/canonical-types.ts",
  module_registry: "src/lib/core/module-registry.ts",
  routes: "src/App.tsx",
  i18n: "src/lib/i18n-data.ts",
  wallet_state: "src/domains/wallet/service.ts",
  orbit_state: "src/domains/orbit/service.ts",
  user_state: "src/domains/me/service.ts",
  dashboard_state: "src/domains/dashboard/service.ts",
  radar_state: "src/domains/radar/service.ts",
  state_machines: "src/lib/god/state-machines.ts",
  content_graph: "src/lib/god/canonical-content-graph.ts",
  god_taxonomy: "src/lib/god/taxonomy-god-engine.ts",
};

const DOMAIN_BOUNDARIES: Record<string, string[]> = {
  marketplace: ["listing", "product", "service_item", "review", "category"],
  wallet: ["payment", "transaction", "wallet_account", "escrow", "payout"],
  orbit: ["message_thread", "call_session", "presence"],
  radar: ["location", "geo", "map", "proximity"],
  dashboard: ["summary", "activity", "notification", "card"],
  delivery: ["delivery_job", "rider", "route", "tracking"],
  booking: ["booking", "room", "calendar", "availability"],
  property: ["property", "listing_property", "unit"],
  hotel: ["hotel_unit", "room_type", "rate_plan"],
  food: ["menu", "restaurant", "cuisine", "modifier"],
  health: ["hospital", "pharmacy", "clinic"],
  transport: ["taxi", "driver", "ride", "fare"],
  media: ["media_asset", "banner", "ad_campaign", "gallery"],
};

class AntiConflictEngine extends BaseEngine {
  private conflicts: ConflictReport[] = [];
  private mode: ConflictMode = "DETECT";
  private scanCount = 0;

  constructor() {
    super({
      id: "anti-conflict-engine",
      name: "Anti-Conflict Engine",
      category: "god",
      intervalMs: 5 * 60 * 1000,
    });
  }

  setMode(mode: ConflictMode): void {
    this.mode = mode;
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const result = this.runFullScan();
    this.scanCount++;
    const duration = Math.round(performance.now() - start);

    const actions: string[] = [];
    if (result.auto_fixable_conflicts > 0) {
      actions.push(`${result.auto_fixable_conflicts} auto-fixable conflicts found`);
    }
    if (result.blocking_conflicts > 0) {
      actions.push(`${result.blocking_conflicts} BLOCKING conflicts`);
    }

    return {
      level: result.blocking_conflicts > 0 ? "act" : result.total_conflicts > 0 ? "detect" : "observe",
      findings: result.total_conflicts,
      actions,
      duration,
    };
  }

  runFullScan(): ConflictScanResult {
    const conflicts: ConflictReport[] = [];
    const now = Date.now();

    conflicts.push(...this.scanTaxonomyConflicts(now));
    conflicts.push(...this.scanStateMachineConflicts(now));
    conflicts.push(...this.scanSourceOfTruthConflicts(now));
    conflicts.push(...this.scanDomainBoundaryConflicts(now));
    conflicts.push(...this.scanGraphConflicts(now));

    this.conflicts = conflicts;

    const blocking = conflicts.filter((c) => c.severity === "critical" && !c.resolved);
    const autoFixable = conflicts.filter((c) => c.auto_fixable && !c.resolved);
    const humanReview = conflicts.filter((c) => !c.auto_fixable && !c.resolved);

    let severityScore = 0;
    for (const c of conflicts) {
      if (c.resolved) continue;
      switch (c.severity) {
        case "critical": severityScore += 10; break;
        case "high": severityScore += 5; break;
        case "medium": severityScore += 2; break;
        case "low": severityScore += 1; break;
      }
    }

    return {
      timestamp: now,
      total_conflicts: conflicts.length,
      blocking_conflicts: blocking.length,
      auto_fixable_conflicts: autoFixable.length,
      human_review_needed: humanReview.length,
      severity_score: severityScore,
      conflicts,
      mode: this.mode,
    };
  }

  private scanTaxonomyConflicts(now: number): ConflictReport[] {
    const taxonomyConflicts = taxonomyGodEngine.detectConflicts();
    return taxonomyConflicts.map((tc, i) => ({
      id: `tax-conflict-${now}-${i}`,
      type: `taxonomy_${tc.type}`,
      severity: tc.severity,
      description: tc.description,
      source_a: tc.path_a,
      source_b: tc.path_b,
      domain: "taxonomy",
      auto_fixable: tc.auto_fixable,
      suggested_fix: tc.suggested_fix,
      linked_files: [SOURCE_OF_TRUTH.taxonomy, SOURCE_OF_TRUTH.god_taxonomy],
      detected_at: now,
      resolved: false,
    }));
  }

  private scanStateMachineConflicts(now: number): ConflictReport[] {
    const results: ConflictReport[] = [];
    const audits = stateMachineEngine.auditAll();

    for (const audit of audits) {
      if (!audit.valid) {
        for (const issue of audit.issues) {
          results.push({
            id: `sm-conflict-${now}-${audit.machine}`,
            type: "state_machine_broken",
            severity: "critical",
            description: `${audit.machine}: ${issue}`,
            source_a: audit.machine,
            source_b: SOURCE_OF_TRUTH.state_machines,
            domain: "state_machines",
            auto_fixable: false,
            linked_files: [SOURCE_OF_TRUTH.state_machines],
            detected_at: now,
            resolved: false,
          });
        }
      }
    }

    return results;
  }

  private scanSourceOfTruthConflicts(now: number): ConflictReport[] {
    const results: ConflictReport[] = [];
    const seenDomains = new Set<string>();

    for (const [domain] of Object.entries(SOURCE_OF_TRUTH)) {
      if (seenDomains.has(domain)) {
        results.push({
          id: `sot-conflict-${now}-${domain}`,
          type: "duplicate_source_of_truth",
          severity: "critical",
          description: `Multiple sources of truth detected for domain: ${domain}`,
          source_a: domain,
          source_b: SOURCE_OF_TRUTH[domain],
          domain,
          auto_fixable: false,
          linked_files: [SOURCE_OF_TRUTH[domain]],
          detected_at: now,
          resolved: false,
        });
      }
      seenDomains.add(domain);
    }

    return results;
  }

  private scanDomainBoundaryConflicts(now: number): ConflictReport[] {
    const results: ConflictReport[] = [];
    const entityToDomain = new Map<string, string[]>();

    for (const [domain, entities] of Object.entries(DOMAIN_BOUNDARIES)) {
      for (const entity of entities) {
        if (!entityToDomain.has(entity)) entityToDomain.set(entity, []);
        entityToDomain.get(entity)!.push(domain);
      }
    }

    for (const [entity, domains] of entityToDomain) {
      if (domains.length > 1) {
        results.push({
          id: `boundary-conflict-${now}-${entity}`,
          type: "domain_boundary_overlap",
          severity: "medium",
          description: `Entity "${entity}" claimed by multiple domains: ${domains.join(", ")}`,
          source_a: domains[0],
          source_b: domains[1],
          domain: "architecture",
          auto_fixable: false,
          linked_files: [SOURCE_OF_TRUTH.module_registry],
          detected_at: now,
          resolved: false,
        });
      }
    }

    return results;
  }

  private scanGraphConflicts(now: number): ConflictReport[] {
    const results: ConflictReport[] = [];
    const stats = contentGraph.getStats();

    if (stats.brokenEdgeCount > 0) {
      results.push({
        id: `graph-broken-edges-${now}`,
        type: "broken_graph_edges",
        severity: "high",
        description: `${stats.brokenEdgeCount} broken edges in content graph`,
        source_a: "content_graph",
        source_b: "edges",
        domain: "graph",
        auto_fixable: true,
        suggested_fix: "Remove edges referencing non-existent nodes",
        linked_files: [SOURCE_OF_TRUTH.content_graph],
        detected_at: now,
        resolved: false,
      });
    }

    if (stats.orphanCount > 0) {
      results.push({
        id: `graph-orphan-nodes-${now}`,
        type: "orphan_graph_nodes",
        severity: "low",
        description: `${stats.orphanCount} orphan nodes in content graph`,
        source_a: "content_graph",
        source_b: "nodes",
        domain: "graph",
        auto_fixable: false,
        linked_files: [SOURCE_OF_TRUTH.content_graph],
        detected_at: now,
        resolved: false,
      });
    }

    return results;
  }

  getConflicts(severity?: ConflictSeverity): ConflictReport[] {
    if (severity) return this.conflicts.filter((c) => c.severity === severity);
    return [...this.conflicts];
  }

  getBlockingConflicts(): ConflictReport[] {
    return this.conflicts.filter((c) => c.severity === "critical" && !c.resolved);
  }

  resolveConflict(id: string): boolean {
    const conflict = this.conflicts.find((c) => c.id === id);
    if (!conflict) return false;
    conflict.resolved = true;
    conflict.resolved_at = Date.now();
    return true;
  }

  getSourceOfTruth(domain: string): string | undefined {
    return SOURCE_OF_TRUTH[domain];
  }

  getStats() {
    return {
      mode: this.mode,
      scanCount: this.scanCount,
      totalConflicts: this.conflicts.length,
      unresolvedConflicts: this.conflicts.filter((c) => !c.resolved).length,
      blockingConflicts: this.getBlockingConflicts().length,
      severityBreakdown: {
        critical: this.conflicts.filter((c) => c.severity === "critical" && !c.resolved).length,
        high: this.conflicts.filter((c) => c.severity === "high" && !c.resolved).length,
        medium: this.conflicts.filter((c) => c.severity === "medium" && !c.resolved).length,
        low: this.conflicts.filter((c) => c.severity === "low" && !c.resolved).length,
      },
    };
  }
}

export const antiConflictEngine = new AntiConflictEngine();
