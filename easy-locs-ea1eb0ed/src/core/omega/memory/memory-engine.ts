import type { MemoryEntry, MemoryDetails, OmegaEngineStatus } from "../omega-types";
import { omegaPersistence } from "../omega-persistence";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { learningGovernance, buildLearningChainContext, type LearningChainStage } from "@/core/command-center";

const MAX_MEMORIES = 5_000;
let memIdCounter = 0;

type MemoryCategory = MemoryEntry["category"];

export interface GovernedRecordParams {
  category: MemoryCategory;
  domain: string;
  summary: string;
  details?: MemoryDetails;
  outcome?: MemoryEntry["outcome"];
  beforeScore?: number;
  afterScore?: number;
  rootCause?: string;
  relatedIds?: string[];
  ttlDays?: number;
  engineId: string;
  taskId: string;
  executionId: string;
  evidenceId: string;
  validationId: string;
  canonicalizationId: string;
  confidence: number;
  completedStages: LearningChainStage[];
  isFromMock?: boolean;
  isFromFallback?: boolean;
  isFromConflict?: boolean;
  isFromError?: boolean;
  isFromFailedRepair?: boolean;
  isFromDirtyTaxonomy?: boolean;
  isFromNonCanonicalVersion?: boolean;
  isFromQuarantinedEngine?: boolean;
  isFromBlockedEngine?: boolean;
}

class MemoryEngine {
  readonly name = "omega-memory";
  readonly domain = "omega";
  status: OmegaEngineStatus = "idle";
  lastRunAt = 0;

  private memories = new Map<string, MemoryEntry>();
  private categoryIndex = new Map<MemoryCategory, Set<string>>();
  private domainIndex = new Map<string, Set<string>>();

  getStatus(): OmegaEngineStatus { return this.status; }
  getHeartbeat() { return { alive: this.status !== "stopped", lastBeat: this.lastRunAt }; }

  /**
   * GOVERNED write path — all new code must use this.
   * Validates the full learning chain before accepting the write.
   * Returns null if rejected by Learning Governance.
   */
  governedRecord(params: GovernedRecordParams): MemoryEntry | null {
    const chainContext = buildLearningChainContext({
      taskId: params.taskId,
      executionId: params.executionId,
      evidenceId: params.evidenceId,
      validationId: params.validationId,
      canonicalizationId: params.canonicalizationId,
      engineId: params.engineId,
      domain: params.domain,
      source: params.engineId,
      outcome: params.outcome === "success" ? "success" : params.outcome === "failure" ? "failure" : "partial",
      confidence: params.confidence,
      completedStages: params.completedStages,
      isFromMock: params.isFromMock ?? false,
      isFromFallback: params.isFromFallback ?? false,
      isFromConflict: params.isFromConflict ?? false,
      isFromError: params.isFromError ?? false,
      isFromFailedRepair: params.isFromFailedRepair ?? false,
      isFromDirtyTaxonomy: params.isFromDirtyTaxonomy ?? false,
      isFromNonCanonicalVersion: params.isFromNonCanonicalVersion ?? false,
      isFromQuarantinedEngine: params.isFromQuarantinedEngine ?? false,
      isFromBlockedEngine: params.isFromBlockedEngine ?? false,
    });

    const govResult = learningGovernance.write(params.engineId, params.domain, params.summary, chainContext);
    if (!govResult.success) {
      structuredLogger.warn("system", "memory_governance_rejected", `Governed write rejected for ${params.engineId}/${params.domain}: ${govResult.rejectedReason}`);
      return null;
    }

    return this.internalRecord(
      params.category,
      params.domain,
      params.summary,
      params.details,
      params.outcome,
      params.beforeScore,
      params.afterScore,
      params.rootCause,
      params.relatedIds,
      params.ttlDays,
    );
  }

  private internalRecord(category: MemoryCategory, domain: string, summary: string, details: MemoryDetails = {}, outcome: MemoryEntry["outcome"] = "pending", beforeScore = 0, afterScore = 0, rootCause?: string, relatedIds: string[] = [], ttlDays = 90): MemoryEntry {
    if (this.memories.size >= MAX_MEMORIES) {
      this.evictOldest();
    }
    const memory_id = `mem_${++memIdCounter}`;
    const entry: MemoryEntry = {
      memory_id, category, domain, summary, details, outcome,
      before_score: beforeScore, after_score: afterScore,
      root_cause: rootCause, related_ids: relatedIds,
      created_at: Date.now(), ttl_days: ttlDays,
    };
    this.memories.set(memory_id, entry);
    if (!this.categoryIndex.has(category)) this.categoryIndex.set(category, new Set());
    this.categoryIndex.get(category)!.add(memory_id);
    if (!this.domainIndex.has(domain)) this.domainIndex.set(domain, new Set());
    this.domainIndex.get(domain)!.add(memory_id);
    omegaPersistence.writeMemory(entry).catch(() => {});
    return entry;
  }

  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [id, mem] of this.memories) {
      if (mem.created_at < oldestTime) {
        oldestTime = mem.created_at;
        oldestId = id;
      }
    }
    if (oldestId) this.forget(oldestId);
  }

  forget(memoryId: string): boolean {
    const mem = this.memories.get(memoryId);
    if (!mem) return false;
    const catSet = this.categoryIndex.get(mem.category);
    if (catSet) { catSet.delete(memoryId); if (catSet.size === 0) this.categoryIndex.delete(mem.category); }
    const domSet = this.domainIndex.get(mem.domain);
    if (domSet) { domSet.delete(memoryId); if (domSet.size === 0) this.domainIndex.delete(mem.domain); }
    this.memories.delete(memoryId);
    return true;
  }

  getByCategory(category: MemoryCategory): MemoryEntry[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) return [];
    return [...ids].map((id) => this.memories.get(id)!).filter(Boolean);
  }

  getByDomain(domain: string): MemoryEntry[] {
    const ids = this.domainIndex.get(domain);
    if (!ids) return [];
    return [...ids].map((id) => this.memories.get(id)!).filter(Boolean);
  }

  findRecurringPatterns(category: MemoryCategory, minOccurrences = 3): Array<{ pattern: string; count: number; domains: string[] }> {
    const entries = this.getByCategory(category);
    const summaryMap = new Map<string, { count: number; domains: Set<string> }>();
    for (const e of entries) {
      const key = e.summary.toLowerCase().slice(0, 80);
      if (!summaryMap.has(key)) summaryMap.set(key, { count: 0, domains: new Set() });
      const rec = summaryMap.get(key)!;
      rec.count++;
      rec.domains.add(e.domain);
    }
    return [...summaryMap.entries()]
      .filter(([, v]) => v.count >= minOccurrences)
      .map(([pattern, v]) => ({ pattern, count: v.count, domains: [...v.domains] }))
      .sort((a, b) => b.count - a.count);
  }

  findRootCauses(): Array<{ root_cause: string; count: number; categories: string[] }> {
    const causeMap = new Map<string, { count: number; categories: Set<string> }>();
    for (const [, mem] of this.memories) {
      if (mem.root_cause) {
        if (!causeMap.has(mem.root_cause)) causeMap.set(mem.root_cause, { count: 0, categories: new Set() });
        const rec = causeMap.get(mem.root_cause)!;
        rec.count++;
        rec.categories.add(mem.category);
      }
    }
    return [...causeMap.entries()]
      .map(([root_cause, v]) => ({ root_cause, count: v.count, categories: [...v.categories] }))
      .sort((a, b) => b.count - a.count);
  }

  findUnstableDomains(): Array<{ domain: string; incident_count: number; regression_count: number; conflict_count: number }> {
    const domains = new Map<string, { incidents: number; regressions: number; conflicts: number }>();
    for (const [, mem] of this.memories) {
      if (!domains.has(mem.domain)) domains.set(mem.domain, { incidents: 0, regressions: 0, conflicts: 0 });
      const d = domains.get(mem.domain)!;
      if (mem.category === "incident") d.incidents++;
      if (mem.category === "regression") d.regressions++;
      if (mem.category === "conflict") d.conflicts++;
    }
    return [...domains.entries()]
      .map(([domain, v]) => ({ domain, incident_count: v.incidents, regression_count: v.regressions, conflict_count: v.conflicts }))
      .filter((d) => d.incident_count + d.regression_count + d.conflict_count > 0)
      .sort((a, b) => (b.incident_count + b.regression_count + b.conflict_count) - (a.incident_count + a.regression_count + a.conflict_count));
  }

  getImprovementHistory(): Array<{ domain: string; avg_improvement: number; count: number }> {
    const domainImprovements = new Map<string, { total: number; count: number }>();
    for (const [, mem] of this.memories) {
      if (mem.category === "optimization" && mem.outcome === "success") {
        if (!domainImprovements.has(mem.domain)) domainImprovements.set(mem.domain, { total: 0, count: 0 });
        const d = domainImprovements.get(mem.domain)!;
        d.total += mem.after_score - mem.before_score;
        d.count++;
      }
    }
    return [...domainImprovements.entries()]
      .map(([domain, v]) => ({ domain, avg_improvement: v.count > 0 ? v.total / v.count : 0, count: v.count }))
      .sort((a, b) => b.avg_improvement - a.avg_improvement);
  }

  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, mem] of this.memories) {
      const expiresAt = mem.created_at + mem.ttl_days * 86_400_000;
      if (now > expiresAt) {
        this.forget(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  getStats() {
    const categoryCounts: Record<string, number> = {};
    for (const [cat, ids] of this.categoryIndex) {
      categoryCounts[cat] = ids.size;
    }
    return {
      total_memories: this.memories.size,
      categories: categoryCounts,
      domains: this.domainIndex.size,
      recurring_patterns: this.findRecurringPatterns("incident", 2).length,
      root_causes: this.findRootCauses().length,
    };
  }

  async boot(): Promise<void> {
    const persisted = await omegaPersistence.loadMemories();
    if (persisted.length > 0 && this.memories.size === 0) {
      for (const m of persisted) {
        this.memories.set(m.memory_id, m);
        if (!this.categoryIndex.has(m.category)) this.categoryIndex.set(m.category, new Set());
        this.categoryIndex.get(m.category)!.add(m.memory_id);
        if (!this.domainIndex.has(m.domain)) this.domainIndex.set(m.domain, new Set());
        this.domainIndex.get(m.domain)!.add(m.memory_id);
      }
      memIdCounter = persisted.length;
    }
    this.status = "active";
    this.lastRunAt = Date.now();
    structuredLogger.info("system", "omega_engine_boot", `MemoryEngine booted | memories: ${this.memories.size} (${persisted.length} restored)`);
  }

  shutdown(): void { this.status = "stopped"; }
}

export const memoryEngine = new MemoryEngine();
