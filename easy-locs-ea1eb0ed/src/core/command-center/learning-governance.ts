/**
 * Learning Governance Hard Lock — Validated Learning Chain Enforcement
 *
 * The Memory Engine ONLY accepts writes that pass through the full validated chain:
 * TASK → EXECUTION → EVIDENCE → VALIDATION → CANONICALIZATION → MEMORY WRITE → FUTURE REUSE
 *
 * FORBIDDEN learning sources:
 * - Mocks or test fixtures
 * - Fallback values (degraded mode outputs)
 * - Conflicts or unresolved disputes
 * - Errors or exceptions
 * - Unverified signals
 * - Failed repairs
 * - Dirty taxonomy paths
 * - Non-canonical versions
 *
 * Memory is organized in 10 layers:
 * 1. VALIDATED_FACTS
 * 2. VALIDATED_PATTERNS
 * 3. KNOWN_FAILURES
 * 4. ANTI_PATTERNS
 * 5. VALIDATED_REPAIRS
 * 6. BLOCKED_CONDITIONS
 * 7. CANONICAL_MAPPINGS
 * 8. HIGH_CONFIDENCE_OPTIMIZATIONS
 * 9. QUARANTINED_LEARNINGS
 * 10. DEPRECATED_LEARNINGS
 *
 * Pillar 3 of the Engine Discipline Infrastructure.
 */

export type LearningChainStage =
  | "TASK"
  | "EXECUTION"
  | "EVIDENCE"
  | "VALIDATION"
  | "CANONICALIZATION"
  | "MEMORY_WRITE"
  | "FUTURE_REUSE";

export type MemoryLayer =
  | "VALIDATED_FACTS"
  | "VALIDATED_PATTERNS"
  | "KNOWN_FAILURES"
  | "ANTI_PATTERNS"
  | "VALIDATED_REPAIRS"
  | "BLOCKED_CONDITIONS"
  | "CANONICAL_MAPPINGS"
  | "HIGH_CONFIDENCE_OPTIMIZATIONS"
  | "QUARANTINED_LEARNINGS"
  | "DEPRECATED_LEARNINGS";

export type ForbiddenLearningSource =
  | "MOCK"
  | "TEST_FIXTURE"
  | "FALLBACK"
  | "DEGRADED_MODE_OUTPUT"
  | "CONFLICT"
  | "UNRESOLVED_DISPUTE"
  | "ERROR"
  | "EXCEPTION"
  | "UNVERIFIED_SIGNAL"
  | "FAILED_REPAIR"
  | "DIRTY_TAXONOMY"
  | "NON_CANONICAL_VERSION"
  | "QUARANTINED_ENGINE_OUTPUT"
  | "BLOCKED_ENGINE_OUTPUT";

export interface LearningChainContext {
  taskId: string;
  executionId: string;
  evidenceId: string;
  validationId: string;
  canonicalizationId: string;
  engineId: string;
  domain: string;
  completedStages: LearningChainStage[];
  source: string;
  outcome: "success" | "failure" | "partial";
  confidence: number;
  isFromMock: boolean;
  isFromFallback: boolean;
  isFromConflict: boolean;
  isFromError: boolean;
  isFromFailedRepair: boolean;
  isFromDirtyTaxonomy: boolean;
  isFromNonCanonicalVersion: boolean;
  isFromQuarantinedEngine: boolean;
  isFromBlockedEngine: boolean;
  taxonomyPath?: string;
  canonicalVersion?: string;
  timestamp: number;
}

export interface LearningValidationResult {
  approved: boolean;
  rejectedReason: string | null;
  rejectedSources: ForbiddenLearningSource[];
  missingStages: LearningChainStage[];
  targetLayer: MemoryLayer;
  confidence: number;
  warnings: string[];
}

export interface GovernedMemoryWrite {
  memoryId: string;
  layer: MemoryLayer;
  engineId: string;
  domain: string;
  summary: string;
  chainContext: LearningChainContext;
  validationResult: LearningValidationResult;
  writtenAt: number;
}

const REQUIRED_CHAIN_STAGES: LearningChainStage[] = [
  "TASK",
  "EXECUTION",
  "EVIDENCE",
  "VALIDATION",
  "CANONICALIZATION",
  "MEMORY_WRITE",
];

const MIN_CONFIDENCE_BY_LAYER: Record<MemoryLayer, number> = {
  VALIDATED_FACTS: 0.9,
  VALIDATED_PATTERNS: 0.8,
  KNOWN_FAILURES: 0.7,
  ANTI_PATTERNS: 0.7,
  VALIDATED_REPAIRS: 0.85,
  BLOCKED_CONDITIONS: 0.6,
  CANONICAL_MAPPINGS: 0.95,
  HIGH_CONFIDENCE_OPTIMIZATIONS: 0.92,
  QUARANTINED_LEARNINGS: 0.0,
  DEPRECATED_LEARNINGS: 0.0,
};

let writeCounter = 0;

class LearningGovernance {
  private memoryLayers = new Map<MemoryLayer, GovernedMemoryWrite[]>();
  private writeLog: GovernedMemoryWrite[] = [];
  private rejectionLog: Array<{ context: LearningChainContext; result: LearningValidationResult; timestamp: number }> = [];
  private readonly MAX_WRITES_PER_LAYER = 10_000;
  private readonly MAX_REJECTION_LOG = 1_000;

  constructor() {
    const layers: MemoryLayer[] = [
      "VALIDATED_FACTS",
      "VALIDATED_PATTERNS",
      "KNOWN_FAILURES",
      "ANTI_PATTERNS",
      "VALIDATED_REPAIRS",
      "BLOCKED_CONDITIONS",
      "CANONICAL_MAPPINGS",
      "HIGH_CONFIDENCE_OPTIMIZATIONS",
      "QUARANTINED_LEARNINGS",
      "DEPRECATED_LEARNINGS",
    ];
    for (const layer of layers) {
      this.memoryLayers.set(layer, []);
    }
  }

  /**
   * Main gate: validate a learning chain context before allowing a memory write.
   * Returns full validation result with layer assignment or rejection reason.
   */
  validateLearningChain(context: LearningChainContext): LearningValidationResult {
    const rejectedSources: ForbiddenLearningSource[] = [];
    const warnings: string[] = [];
    const missingStages: LearningChainStage[] = [];

    for (const stage of REQUIRED_CHAIN_STAGES) {
      if (!context.completedStages.includes(stage)) {
        missingStages.push(stage);
      }
    }

    if (context.isFromMock) rejectedSources.push("MOCK");
    if (context.isFromFallback) rejectedSources.push("FALLBACK");
    if (context.isFromConflict) rejectedSources.push("CONFLICT");
    if (context.isFromError) rejectedSources.push("ERROR");
    if (context.isFromFailedRepair) rejectedSources.push("FAILED_REPAIR");
    if (context.isFromDirtyTaxonomy) rejectedSources.push("DIRTY_TAXONOMY");
    if (context.isFromNonCanonicalVersion) rejectedSources.push("NON_CANONICAL_VERSION");
    if (context.isFromQuarantinedEngine) rejectedSources.push("QUARANTINED_ENGINE_OUTPUT");
    if (context.isFromBlockedEngine) rejectedSources.push("BLOCKED_ENGINE_OUTPUT");

    if (missingStages.length > 0 || rejectedSources.length > 0) {
      const reasons: string[] = [];
      if (missingStages.length > 0) reasons.push(`Missing chain stages: ${missingStages.join(", ")}`);
      if (rejectedSources.length > 0) reasons.push(`Forbidden sources: ${rejectedSources.join(", ")}`);

      return {
        approved: false,
        rejectedReason: reasons.join("; "),
        rejectedSources,
        missingStages,
        targetLayer: "QUARANTINED_LEARNINGS",
        confidence: context.confidence,
        warnings,
      };
    }

    const targetLayer = this.determineLayer(context);

    const minConf = MIN_CONFIDENCE_BY_LAYER[targetLayer];
    if (context.confidence < minConf && targetLayer !== "QUARANTINED_LEARNINGS" && targetLayer !== "DEPRECATED_LEARNINGS") {
      warnings.push(`Confidence ${context.confidence.toFixed(2)} is below minimum ${minConf} for layer ${targetLayer}`);
      if (context.confidence < 0.5) {
        return {
          approved: false,
          rejectedReason: `Confidence ${context.confidence.toFixed(2)} too low for any production memory layer (minimum 0.5)`,
          rejectedSources,
          missingStages,
          targetLayer: "QUARANTINED_LEARNINGS",
          confidence: context.confidence,
          warnings,
        };
      }
    }

    if (context.outcome === "failure" && targetLayer !== "KNOWN_FAILURES" && targetLayer !== "ANTI_PATTERNS" && targetLayer !== "BLOCKED_CONDITIONS") {
      warnings.push("Failure outcome redirected to KNOWN_FAILURES layer");
      return {
        approved: true,
        rejectedReason: null,
        rejectedSources,
        missingStages,
        targetLayer: "KNOWN_FAILURES",
        confidence: context.confidence,
        warnings,
      };
    }

    return {
      approved: true,
      rejectedReason: null,
      rejectedSources,
      missingStages,
      targetLayer,
      confidence: context.confidence,
      warnings,
    };
  }

  /**
   * Execute a governed memory write. Rejects if chain validation fails.
   */
  write(
    engineId: string,
    domain: string,
    summary: string,
    context: LearningChainContext,
  ): { success: boolean; write: GovernedMemoryWrite | null; rejectedReason: string | null } {
    const validationResult = this.validateLearningChain(context);

    if (!validationResult.approved) {
      this.recordRejection(context, validationResult);
      return { success: false, write: null, rejectedReason: validationResult.rejectedReason };
    }

    const memoryId = `lgov_${Date.now()}_${++writeCounter}`;
    const write: GovernedMemoryWrite = {
      memoryId,
      layer: validationResult.targetLayer,
      engineId,
      domain,
      summary,
      chainContext: context,
      validationResult,
      writtenAt: Date.now(),
    };

    const layerData = this.memoryLayers.get(validationResult.targetLayer) ?? [];
    layerData.push(write);
    if (layerData.length > this.MAX_WRITES_PER_LAYER) {
      layerData.splice(0, layerData.length - this.MAX_WRITES_PER_LAYER);
    }
    this.memoryLayers.set(validationResult.targetLayer, layerData);

    this.writeLog.push(write);
    if (this.writeLog.length > 5_000) {
      this.writeLog.splice(0, this.writeLog.length - 5_000);
    }

    return { success: true, write, rejectedReason: null };
  }

  /**
   * Deprecate a memory entry (move from any layer to DEPRECATED_LEARNINGS).
   */
  deprecate(memoryId: string, reason: string): boolean {
    for (const [layer, writes] of this.memoryLayers) {
      if (layer === "DEPRECATED_LEARNINGS") continue;
      const idx = writes.findIndex((w) => w.memoryId === memoryId);
      if (idx !== -1) {
        const write = writes.splice(idx, 1)[0];
        const deprecated = this.memoryLayers.get("DEPRECATED_LEARNINGS") ?? [];
        deprecated.push({ ...write, layer: "DEPRECATED_LEARNINGS" });
        this.memoryLayers.set("DEPRECATED_LEARNINGS", deprecated);
        return true;
      }
    }
    return false;
  }

  getByLayer(layer: MemoryLayer): GovernedMemoryWrite[] {
    return [...(this.memoryLayers.get(layer) ?? [])];
  }

  getLayerStats(): Record<MemoryLayer, number> {
    const stats: Partial<Record<MemoryLayer, number>> = {};
    for (const [layer, writes] of this.memoryLayers) {
      stats[layer] = writes.size ?? writes.length;
    }
    return stats as Record<MemoryLayer, number>;
  }

  getRejectionLog(): typeof this.rejectionLog {
    return [...this.rejectionLog];
  }

  getStats() {
    const layerStats = this.getLayerStats();
    return {
      total_writes: this.writeLog.length,
      total_rejections: this.rejectionLog.length,
      layers: layerStats,
    };
  }

  private determineLayer(context: LearningChainContext): MemoryLayer {
    if (context.outcome === "failure") return "KNOWN_FAILURES";
    if (context.confidence >= 0.95 && context.source === "canonical") return "CANONICAL_MAPPINGS";
    if (context.confidence >= 0.92) return "HIGH_CONFIDENCE_OPTIMIZATIONS";
    if (context.confidence >= 0.9) return "VALIDATED_FACTS";
    if (context.confidence >= 0.85) return "VALIDATED_REPAIRS";
    if (context.confidence >= 0.8) return "VALIDATED_PATTERNS";
    if (context.confidence >= 0.7) return "ANTI_PATTERNS";
    return "BLOCKED_CONDITIONS";
  }

  private recordRejection(context: LearningChainContext, result: LearningValidationResult): void {
    this.rejectionLog.push({ context, result, timestamp: Date.now() });
    if (this.rejectionLog.length > this.MAX_REJECTION_LOG) {
      this.rejectionLog.splice(0, this.rejectionLog.length - this.MAX_REJECTION_LOG);
    }
  }
}

export const learningGovernance = new LearningGovernance();

/**
 * Build a pre-validated chain context for system-level observability writes.
 * Used by internal engine monitors, health watchers, and incident recorders
 * where the full user-task chain is not applicable but the write is a verified
 * system observation (engine health, incident escalation, etc.).
 * All stages are marked complete at system confidence.
 */
export function buildSystemChainContext(engineId: string, domain: string, outcome: "success" | "failure" | "partial", confidence = 0.75): LearningChainContext {
  const ts = String(Date.now());
  return {
    taskId: `sys_task_${ts}`,
    executionId: `sys_exec_${ts}`,
    evidenceId: `sys_evidence_${ts}`,
    validationId: `sys_valid_${ts}`,
    canonicalizationId: `sys_canon_${ts}`,
    engineId,
    domain,
    source: engineId,
    outcome,
    confidence,
    completedStages: ["TASK", "EXECUTION", "EVIDENCE", "VALIDATION", "CANONICALIZATION", "MEMORY_WRITE"],
    isFromMock: false,
    isFromFallback: false,
    isFromConflict: false,
    isFromError: false,
    isFromFailedRepair: false,
    isFromDirtyTaxonomy: false,
    isFromNonCanonicalVersion: false,
    isFromQuarantinedEngine: false,
    isFromBlockedEngine: false,
    timestamp: Date.now(),
  };
}

export function buildLearningChainContext(params: {
  taskId: string;
  executionId: string;
  evidenceId: string;
  validationId: string;
  canonicalizationId: string;
  engineId: string;
  domain: string;
  source: string;
  outcome: "success" | "failure" | "partial";
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
  taxonomyPath?: string;
  canonicalVersion?: string;
}): LearningChainContext {
  return {
    taskId: params.taskId,
    executionId: params.executionId,
    evidenceId: params.evidenceId,
    validationId: params.validationId,
    canonicalizationId: params.canonicalizationId,
    engineId: params.engineId,
    domain: params.domain,
    source: params.source,
    outcome: params.outcome,
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
    taxonomyPath: params.taxonomyPath,
    canonicalVersion: params.canonicalVersion,
    timestamp: Date.now(),
  };
}
