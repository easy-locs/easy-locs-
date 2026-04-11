import type { InvariantDefinition, InvariantCheckResult, SentinelSeverity } from "../types";
import { sentinelEngineRegistry } from "../registry/engine-registry";
import { sentinelCronRegistry } from "../registry/cron-registry";
import { sentinelPageRegistry } from "../registry/page-registry";
import { sentinelCardRegistry } from "../registry/card-registry";
import { sentinelSourceOfTruthRegistry } from "../registry/source-of-truth-registry";
import { sentinelTaxonomyRegistry } from "../registry/taxonomy-registry";

class SentinelInvariantEngine {
  private invariants = new Map<string, InvariantDefinition>();
  private lastResults = new Map<string, InvariantCheckResult>();

  register(def: InvariantDefinition): void {
    this.invariants.set(def.invariant_id, def);
  }

  get(id: string): InvariantDefinition | undefined {
    return this.invariants.get(id);
  }

  getAll(): InvariantDefinition[] {
    return Array.from(this.invariants.values());
  }

  getEnabled(): InvariantDefinition[] {
    return this.getAll().filter((i) => i.enabled);
  }

  getBlocking(): InvariantDefinition[] {
    return this.getAll().filter((i) => i.enabled && i.blocking);
  }

  checkAll(): InvariantCheckResult[] {
    const results: InvariantCheckResult[] = [];
    for (const inv of this.getEnabled()) {
      try {
        const result = inv.check();
        this.lastResults.set(inv.invariant_id, result);
        results.push(result);
      } catch (err) {
        const failResult: InvariantCheckResult = {
          invariant_id: inv.invariant_id,
          passed: false,
          severity: inv.severity,
          blocking: inv.blocking,
          message: `Invariant check crashed: ${err instanceof Error ? err.message : String(err)}`,
          affected_entities: [],
          auto_healable: false,
          checked_at: Date.now(),
        };
        this.lastResults.set(inv.invariant_id, failResult);
        results.push(failResult);
      }
    }
    return results;
  }

  checkBlocking(): { passed: boolean; failures: InvariantCheckResult[] } {
    const results = this.checkAll();
    const failures = results.filter((r) => !r.passed && r.blocking);
    return { passed: failures.length === 0, failures };
  }

  getLastResult(id: string): InvariantCheckResult | undefined {
    return this.lastResults.get(id);
  }

  getLastResults(): InvariantCheckResult[] {
    return Array.from(this.lastResults.values());
  }

  getFailedInvariants(): InvariantCheckResult[] {
    return this.getLastResults().filter((r) => !r.passed);
  }

  getAutoHealable(): InvariantCheckResult[] {
    return this.getLastResults().filter((r) => !r.passed && r.auto_healable);
  }

  registerBuiltins(): void {
    this.register({
      invariant_id: "GLOBAL_001",
      invariant_name: "Critical engines must have recent heartbeat",
      domain: "global",
      severity: "critical",
      description: "No critical engine should be without a recent heartbeat",
      enabled: true,
      blocking: true,
      auto_heal_safe: false,
      check: () => {
        const stale = sentinelEngineRegistry.checkHeartbeats().filter((h) => h.stale);
        const criticalStale = stale.filter((h) => {
          const eng = sentinelEngineRegistry.get(h.engine_id);
          return eng && (eng.criticality === "critical" || eng.criticality === "high");
        });
        return {
          invariant_id: "GLOBAL_001",
          passed: criticalStale.length === 0,
          severity: "critical" as SentinelSeverity,
          blocking: true,
          message: criticalStale.length === 0 ? "All critical engines have heartbeat" : `${criticalStale.length} critical engine(s) with stale heartbeat`,
          affected_entities: criticalStale.map((h) => h.engine_id),
          auto_healable: false,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "GLOBAL_002",
      invariant_name: "Critical cron jobs must have recent valid run",
      domain: "global",
      severity: "critical",
      description: "No critical cron job should be without a last valid run",
      enabled: true,
      blocking: true,
      auto_heal_safe: true,
      check: () => {
        const criticalJobs = sentinelCronRegistry.getByCriticality("critical");
        const failed = criticalJobs.filter((j) => j.enabled && j.last_status === "failed");
        return {
          invariant_id: "GLOBAL_002",
          passed: failed.length === 0,
          severity: "critical" as SentinelSeverity,
          blocking: true,
          message: failed.length === 0 ? "All critical crons healthy" : `${failed.length} critical cron(s) in failed state`,
          affected_entities: failed.map((j) => j.cron_id),
          auto_healable: true,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "GLOBAL_003",
      invariant_name: "No broken major public pages",
      domain: "global",
      severity: "critical",
      description: "No major public page should be in broken state",
      enabled: true,
      blocking: true,
      auto_heal_safe: false,
      check: () => {
        const broken = sentinelPageRegistry.getBroken().filter((p) => p.page_type === "public");
        return {
          invariant_id: "GLOBAL_003",
          passed: broken.length === 0,
          severity: "critical" as SentinelSeverity,
          blocking: true,
          message: broken.length === 0 ? "All public pages healthy" : `${broken.length} broken public page(s)`,
          affected_entities: broken.map((p) => p.page_id),
          auto_healable: false,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "GLOBAL_004",
      invariant_name: "No multiple source-of-truth for critical fields",
      domain: "global",
      severity: "critical",
      description: "A critical field cannot have two authorities",
      enabled: true,
      blocking: true,
      auto_heal_safe: false,
      check: () => {
        const conflicts = sentinelSourceOfTruthRegistry.detectConflicts();
        return {
          invariant_id: "GLOBAL_004",
          passed: conflicts.length === 0,
          severity: "critical" as SentinelSeverity,
          blocking: true,
          message: conflicts.length === 0 ? "Source-of-truth clean" : `${conflicts.length} source-of-truth conflict(s)`,
          affected_entities: conflicts.map((c) => `${c.entity_type}.${c.field_name}`),
          auto_healable: false,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "TAXONOMY_001",
      invariant_name: "All public entities must have canonical_path",
      domain: "taxonomy",
      severity: "high",
      description: "Every public entity must have a valid canonical path",
      enabled: true,
      blocking: false,
      auto_heal_safe: true,
      check: () => {
        const integrity = sentinelTaxonomyRegistry.validateIntegrity();
        return {
          invariant_id: "TAXONOMY_001",
          passed: integrity.valid,
          severity: "high" as SentinelSeverity,
          blocking: false,
          message: integrity.valid ? "Taxonomy integrity valid" : `Taxonomy issues: ${integrity.orphans} orphans, ${integrity.conflicting_aliases} alias conflicts`,
          affected_entities: [],
          auto_healable: true,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "TAXONOMY_002",
      invariant_name: "No alias mapped to incompatible categories",
      domain: "taxonomy",
      severity: "high",
      description: "No alias should resolve to multiple incompatible canonical paths",
      enabled: true,
      blocking: false,
      auto_heal_safe: false,
      check: () => {
        const conflicts = sentinelTaxonomyRegistry.detectConflictingAliases();
        return {
          invariant_id: "TAXONOMY_002",
          passed: conflicts.length === 0,
          severity: "high" as SentinelSeverity,
          blocking: false,
          message: conflicts.length === 0 ? "No conflicting aliases" : `${conflicts.length} conflicting alias(es)`,
          affected_entities: conflicts.map((c) => c.alias_text),
          auto_healable: false,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "DASHBOARD_001",
      invariant_name: "No visible card without data source",
      domain: "dashboard",
      severity: "high",
      description: "Every visible dashboard card must have a real data source and valid route",
      enabled: true,
      blocking: false,
      auto_heal_safe: false,
      check: () => {
        const audit = sentinelCardRegistry.auditAll();
        return {
          invariant_id: "DASHBOARD_001",
          passed: audit.non_compliant === 0,
          severity: "high" as SentinelSeverity,
          blocking: false,
          message: audit.non_compliant === 0 ? "All cards compliant" : `${audit.non_compliant} non-compliant card(s)`,
          affected_entities: audit.issues.map((i) => i.card_id),
          auto_healable: false,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "SEO_001",
      invariant_name: "Public pages must have SEO metadata",
      domain: "seo",
      severity: "high",
      description: "Every major public page must have title, description, canonical, h1",
      enabled: true,
      blocking: false,
      auto_heal_safe: true,
      check: () => {
        const indexable = sentinelPageRegistry.getIndexable();
        const missing = indexable.filter((p) => !p.seo_template);
        return {
          invariant_id: "SEO_001",
          passed: missing.length === 0,
          severity: "high" as SentinelSeverity,
          blocking: false,
          message: missing.length === 0 ? "All indexable pages have SEO templates" : `${missing.length} page(s) missing SEO template`,
          affected_entities: missing.map((p) => p.page_id),
          auto_healable: true,
          checked_at: Date.now(),
        };
      },
    });

    this.register({
      invariant_id: "SEO_002",
      invariant_name: "No duplicate canonicals",
      domain: "seo",
      severity: "medium",
      description: "No two pages should share the same canonical",
      enabled: true,
      blocking: false,
      auto_heal_safe: false,
      check: () => {
        const dupes = sentinelPageRegistry.detectDuplicateCanonicals();
        return {
          invariant_id: "SEO_002",
          passed: dupes.length === 0,
          severity: "medium" as SentinelSeverity,
          blocking: false,
          message: dupes.length === 0 ? "No duplicate canonicals" : `${dupes.length} duplicate canonical(s)`,
          affected_entities: dupes.map((d) => d.canonical),
          auto_healable: false,
          checked_at: Date.now(),
        };
      },
    });
  }
}

export const sentinelInvariantEngine = new SentinelInvariantEngine();
