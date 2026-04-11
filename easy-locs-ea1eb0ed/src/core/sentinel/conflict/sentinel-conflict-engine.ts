import type { ConflictRecord, SentinelSeverity, ConflictResolutionStatus } from "../types";
import type { ScanResult, AuditFinding } from "../contracts";
import { sentinelSourceOfTruthRegistry } from "../registry/source-of-truth-registry";
import { sentinelTaxonomyRegistry } from "../registry/taxonomy-registry";
import { sentinelCronRegistry } from "../registry/cron-registry";
import { sentinelPageRegistry } from "../registry/page-registry";

let conflictCounter = 0;
function nextConflictId(): string {
  return `CONFLICT_${Date.now()}_${++conflictCounter}`;
}

interface ScannerModule {
  id: string;
  name: string;
  scan(): ConflictRecord[];
}

class SentinelConflictEngine {
  private conflicts = new Map<string, ConflictRecord>();
  private scanners: ScannerModule[] = [];
  private readonly MAX_CONFLICTS = 1000;

  constructor() {
    this.registerBuiltinScanners();
  }

  private registerBuiltinScanners(): void {
    this.scanners = [
      {
        id: "source-truth-scanner",
        name: "SourceTruthScanner",
        scan: () => {
          const conflicts = sentinelSourceOfTruthRegistry.detectConflicts();
          return conflicts.map((c) => this.createConflict("source_of_truth", "global", c.entity_type, c.field_name, "critical", c.entity_type, c.field_name, c.conflict, false));
        },
      },
      {
        id: "taxonomy-conflict-scanner",
        name: "TaxonomyConflictScanner",
        scan: () => {
          const aliases = sentinelTaxonomyRegistry.detectConflictingAliases();
          const orphans = sentinelTaxonomyRegistry.detectOrphans();
          const results: ConflictRecord[] = [];
          for (const a of aliases) {
            results.push(this.createConflict("taxonomy_alias", "taxonomy", "alias", a.alias_text, "high", a.targets[0], a.targets[1] || "", `Alias "${a.alias_text}" maps to ${a.targets.length} paths`, false));
          }
          for (const o of orphans) {
            results.push(this.createConflict("taxonomy_orphan", "taxonomy", "taxonomy_entry", o.taxonomy_id, "medium", o.canonical_path, o.parent_path, `Orphan taxonomy node: ${o.canonical_path}`, true));
          }
          return results;
        },
      },
      {
        id: "cron-conflict-scanner",
        name: "CronConflictScanner",
        scan: () => {
          const collisions = sentinelCronRegistry.getCollisions();
          return collisions.map((c) => this.createConflict("cron_collision", "scheduling", "cron_job", c.lock_key, "medium", c.a, c.b, `Cron jobs ${c.a} and ${c.b} share lock_key ${c.lock_key}`, false));
        },
      },
      {
        id: "seo-conflict-scanner",
        name: "SeoConflictScanner",
        scan: () => {
          const dupes = sentinelPageRegistry.detectDuplicateCanonicals();
          return dupes.map((d) => this.createConflict("canonical_conflict", "seo", "page", d.canonical, "high", d.pages[0], d.pages[1] || "", `Duplicate canonical: ${d.canonical} on ${d.pages.length} pages`, false));
        },
      },
      {
        id: "route-conflict-scanner",
        name: "RouteConflictScanner",
        scan: () => {
          const pages = sentinelPageRegistry.getAll();
          const byRoute = new Map<string, string[]>();
          for (const p of pages) {
            const group = byRoute.get(p.route) || [];
            group.push(p.page_id);
            byRoute.set(p.route, group);
          }
          const results: ConflictRecord[] = [];
          for (const [route, ids] of byRoute) {
            if (ids.length > 1) {
              results.push(this.createConflict("route_duplicate", "routing", "page", route, "high", ids[0], ids[1], `Duplicate route: ${route} used by ${ids.length} pages`, false));
            }
          }
          return results;
        },
      },
    ];
  }

  private createConflict(type: string, domain: string, entityType: string, entityId: string, severity: SentinelSeverity, sourceA: string, sourceB: string, description: string, autoFixable: boolean): ConflictRecord {
    return {
      conflict_id: nextConflictId(),
      conflict_type: type,
      domain,
      entity_type: entityType,
      entity_id: entityId,
      severity,
      source_a: sourceA,
      source_b: sourceB,
      description,
      detected_at: Date.now(),
      status: "open",
      auto_fixable: autoFixable,
      resolution_note: "",
    };
  }

  registerScanner(scanner: ScannerModule): void {
    this.scanners.push(scanner);
  }

  runFullScan(): ConflictRecord[] {
    const allConflicts: ConflictRecord[] = [];
    for (const scanner of this.scanners) {
      try {
        const found = scanner.scan();
        allConflicts.push(...found);
      } catch {
        allConflicts.push(this.createConflict("scanner_error", "system", "scanner", scanner.id, "medium", scanner.id, "", `Scanner ${scanner.name} failed`, false));
      }
    }
    for (const c of allConflicts) {
      this.conflicts.set(c.conflict_id, c);
    }
    this.trimConflicts();
    return allConflicts;
  }

  private trimConflicts(): void {
    if (this.conflicts.size <= this.MAX_CONFLICTS) return;
    const sorted = Array.from(this.conflicts.entries()).sort(([, a], [, b]) => a.detected_at - b.detected_at);
    const toRemove = sorted.slice(0, this.conflicts.size - this.MAX_CONFLICTS);
    for (const [key] of toRemove) this.conflicts.delete(key);
  }

  getOpen(): ConflictRecord[] {
    return Array.from(this.conflicts.values()).filter((c) => c.status === "open");
  }

  getCritical(): ConflictRecord[] {
    return this.getOpen().filter((c) => c.severity === "critical");
  }

  getAutoFixable(): ConflictRecord[] {
    return this.getOpen().filter((c) => c.auto_fixable);
  }

  getByDomain(domain: string): ConflictRecord[] {
    return Array.from(this.conflicts.values()).filter((c) => c.domain === domain);
  }

  resolve(conflictId: string, note: string, status: ConflictResolutionStatus = "resolved"): boolean {
    const c = this.conflicts.get(conflictId);
    if (!c) return false;
    c.status = status;
    c.resolution_note = note;
    return true;
  }

  getScore(): number {
    const open = this.getOpen();
    if (open.length === 0) return 100;
    let penalty = 0;
    for (const c of open) {
      if (c.severity === "critical") penalty += 20;
      else if (c.severity === "high") penalty += 10;
      else if (c.severity === "medium") penalty += 5;
      else penalty += 2;
    }
    return Math.max(0, 100 - penalty);
  }

  getSummary(): { total: number; open: number; critical: number; auto_fixable: number; by_domain: Record<string, number>; score: number } {
    const all = Array.from(this.conflicts.values());
    const open = all.filter((c) => c.status === "open");
    const byDomain: Record<string, number> = {};
    for (const c of open) {
      byDomain[c.domain] = (byDomain[c.domain] || 0) + 1;
    }
    return {
      total: all.length,
      open: open.length,
      critical: open.filter((c) => c.severity === "critical").length,
      auto_fixable: open.filter((c) => c.auto_fixable).length,
      by_domain: byDomain,
      score: this.getScore(),
    };
  }

  toScanResult(): ScanResult {
    const open = this.getOpen();
    const findings: AuditFinding[] = open.map((c) => ({
      id: c.conflict_id,
      severity: c.severity,
      category: c.conflict_type,
      message: c.description,
      entity_type: c.entity_type,
      entity_id: c.entity_id,
      auto_fixable: c.auto_fixable,
      blocking: c.severity === "critical",
    }));
    return { scanner_id: "sentinel-conflict-engine", findings, score: this.getScore(), timestamp: Date.now() };
  }
}

export const sentinelConflictEngine = new SentinelConflictEngine();
