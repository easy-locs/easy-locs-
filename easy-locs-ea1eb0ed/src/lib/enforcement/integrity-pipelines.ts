import { platformBus } from "@/lib/shared/platform-bus";
import {
  receiveViolation,
  type EnforcementEngine,
  type ViolationReport,
  type ViolationSeverity,
  type EnforcementAction,
} from "@/lib/control-plane/enforcement-hub";
import { recordObservabilityProof, type ObservabilityProof } from "./observability";

const pendingViolations = new Map<EnforcementEngine, ViolationReport[]>();
const MAX_PENDING = 200;
const processedViolationIds = new Set<string>();
const MAX_PROCESSED_IDS = 5000;

export function pushDetectedViolation(engine: EnforcementEngine, v: ViolationReport): void {
  if (processedViolationIds.has(v.id)) return;
  const list = pendingViolations.get(engine) ?? [];
  list.push(v);
  if (list.length > MAX_PENDING) list.splice(0, list.length - MAX_PENDING);
  pendingViolations.set(engine, list);
}

function drainDetectedViolations(engine: EnforcementEngine): ViolationReport[] {
  const list = pendingViolations.get(engine) ?? [];
  pendingViolations.set(engine, []);
  return list.filter((v) => !processedViolationIds.has(v.id));
}

function markProcessed(violations: ViolationReport[]): void {
  for (const v of violations) {
    processedViolationIds.add(v.id);
  }
  if (processedViolationIds.size > MAX_PROCESSED_IDS) {
    const toRemove = Array.from(processedViolationIds).slice(0, processedViolationIds.size - MAX_PROCESSED_IDS);
    for (const id of toRemove) processedViolationIds.delete(id);
  }
}

export type PipelineId =
  | "taxonomy"
  | "asset"
  | "data"
  | "ui"
  | "flow"
  | "realtime"
  | "security"
  | "repair";

export type PipelineStepResult = "pass" | "fail" | "warn" | "skip";

export interface PipelineStep {
  name: string;
  result: PipelineStepResult;
  detail: string;
  durationMs: number;
}

export interface PipelineRunResult {
  pipelineId: PipelineId;
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  steps: PipelineStep[];
  violations: ViolationReport[];
  actions: EnforcementAction[];
  passed: boolean;
}

type DetectFn = () => ViolationReport[];
type ValidateFn = (violations: ViolationReport[]) => ViolationReport[];

interface PipelineConfig {
  id: PipelineId;
  engine: EnforcementEngine;
  domain: string;
  detect: DetectFn;
  validate?: ValidateFn;
}

let runCounter = 0;

function generateRunId(pipelineId: string): string {
  runCounter++;
  return `pipeline-${pipelineId}-${Date.now()}-${runCounter}`;
}

function runStep(name: string, fn: () => { result: PipelineStepResult; detail: string }): PipelineStep {
  const start = performance.now();
  try {
    const outcome = fn();
    return {
      name,
      result: outcome.result,
      detail: outcome.detail,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      name,
      result: "fail",
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Math.round(performance.now() - start),
    };
  }
}

export function executePipelineRun(config: PipelineConfig): PipelineRunResult {
  const runId = generateRunId(config.id);
  const startedAt = new Date().toISOString();
  const startMs = performance.now();
  const steps: PipelineStep[] = [];
  let detected: ViolationReport[] = [];
  let validated: ViolationReport[] = [];
  const actions: EnforcementAction[] = [];

  steps.push(
    runStep("detect", () => {
      detected = config.detect();
      return {
        result: detected.length > 0 ? "warn" : "pass",
        detail: `Detected ${detected.length} violation(s)`,
      };
    }),
  );

  steps.push(
    runStep("classify", () => {
      for (const v of detected) {
        if (!v.engine) {
          const patched: ViolationReport = { ...v, engine: config.engine };
          detected[detected.indexOf(v)] = patched;
        }
        if (!v.domain) {
          const patched: ViolationReport = { ...detected[detected.indexOf(v)], domain: config.domain };
          detected[detected.indexOf(v)] = patched;
        }
      }
      return {
        result: "pass",
        detail: `Classified ${detected.length} violation(s) for engine=${config.engine}`,
      };
    }),
  );

  steps.push(
    runStep("validate", () => {
      if (config.validate) {
        validated = config.validate(detected);
      } else {
        validated = detected;
      }
      return {
        result: validated.length > 0 ? "warn" : "pass",
        detail: `Validated ${validated.length} of ${detected.length} violation(s)`,
      };
    }),
  );

  steps.push(
    runStep("act", () => {
      for (const v of validated) {
        const action = receiveViolation(v);
        actions.push(action);
      }
      markProcessed(validated);
      const blocked = actions.filter((a) => a.decision === "block").length;
      const quarantined = actions.filter((a) => a.decision === "quarantine").length;
      const corrected = actions.filter((a) => a.decision === "auto_correct").length;
      return {
        result: blocked > 0 ? "fail" : "pass",
        detail: `Actions: ${corrected} corrected, ${quarantined} quarantined, ${blocked} blocked`,
      };
    }),
  );

  steps.push(
    runStep("log_proof", () => {
      const proof: ObservabilityProof = {
        id: `proof-${runId}`,
        source: `pipeline:${config.id}`,
        category: "integrity",
        timestamp: new Date().toISOString(),
        what: `Pipeline ${config.id} run completed`,
        why: validated.length > 0
          ? `${validated.length} violations detected`
          : "Routine integrity check",
        where: config.domain,
        correction: actions.length > 0
          ? actions.map((a) => `${a.violationId}→${a.decision}`).join("; ")
          : "none",
        fallbackUsed: actions.some((a) => a.fallbackUsed),
        rollbackUsed: actions.some((a) => a.rollbackTriggered),
        recurrenceRisk: validated.length > 3 ? "high" : validated.length > 0 ? "medium" : "low",
        metadata: {
          pipelineId: config.id,
          runId,
          violationCount: validated.length,
          actionCount: actions.length,
        },
      };
      recordObservabilityProof(proof);
      return { result: "pass", detail: `Proof recorded: ${proof.id}` };
    }),
  );

  const completedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - startMs);
  const hasFail = steps.some((s) => s.result === "fail");

  platformBus.emit("enforcement:pipeline_completed", {
    pipelineId: config.id,
    runId,
    passed: !hasFail,
    violationCount: validated.length,
    durationMs,
  }, "system");

  return {
    pipelineId: config.id,
    runId,
    startedAt,
    completedAt,
    durationMs,
    steps,
    violations: validated,
    actions,
    passed: !hasFail,
  };
}

const pipelineHistory = new Map<PipelineId, PipelineRunResult[]>();
const MAX_HISTORY = 50;

export function recordPipelineRun(result: PipelineRunResult): void {
  const list = pipelineHistory.get(result.pipelineId) ?? [];
  list.push(result);
  if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
  pipelineHistory.set(result.pipelineId, list);
}

export function getPipelineHistory(pipelineId: PipelineId): PipelineRunResult[] {
  return [...(pipelineHistory.get(pipelineId) ?? [])];
}

interface PipelineStat {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  totalViolations: number;
  avgDurationMs: number;
}

export function getAllPipelineStats(): Record<PipelineId, PipelineStat> {
  const allIds: PipelineId[] = ["taxonomy", "asset", "data", "ui", "flow", "realtime", "security", "repair"];
  const result = {} as Record<PipelineId, PipelineStat>;

  for (const id of allIds) {
    const runs = pipelineHistory.get(id) ?? [];
    const passed = runs.filter((r) => r.passed).length;
    const totalViolations = runs.reduce((sum, r) => sum + r.violations.length, 0);
    const avgDuration = runs.length > 0
      ? Math.round(runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length)
      : 0;

    result[id] = {
      totalRuns: runs.length,
      passedRuns: passed,
      failedRuns: runs.length - passed,
      totalViolations,
      avgDurationMs: avgDuration,
    };
  }

  return result;
}

export function createViolation(
  engine: EnforcementEngine,
  domain: string,
  code: string,
  message: string,
  severity: ViolationSeverity = "warning",
  opts?: {
    entityId?: string;
    entityType?: string;
    confidenceScore?: number;
    metadata?: Record<string, unknown>;
  },
): ViolationReport {
  return {
    id: `v-${engine}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    engine,
    domain,
    severity,
    code,
    message,
    entityId: opts?.entityId,
    entityType: opts?.entityType,
    source: `pipeline:${engine}`,
    detectedAt: new Date().toISOString(),
    metadata: opts?.metadata,
    confidenceScore: opts?.confidenceScore,
  };
}

export function runTaxonomyPipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "taxonomy",
    engine: "taxonomy",
    domain: "taxonomy",
    detect: () => drainDetectedViolations("taxonomy"),
  });
  recordPipelineRun(result);
  return result;
}

export function runAssetPipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "asset",
    engine: "asset",
    domain: "media",
    detect: () => drainDetectedViolations("asset"),
  });
  recordPipelineRun(result);
  return result;
}

export function runDataPipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "data",
    engine: "data",
    domain: "marketplace",
    detect: () => drainDetectedViolations("data"),
  });
  recordPipelineRun(result);
  return result;
}

export function runUiPipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "ui",
    engine: "ui",
    domain: "dashboard",
    detect: () => drainDetectedViolations("ui"),
  });
  recordPipelineRun(result);
  return result;
}

export function runFlowPipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "flow",
    engine: "flow",
    domain: "auth",
    detect: () => drainDetectedViolations("flow"),
  });
  recordPipelineRun(result);
  return result;
}

export function runRealtimePipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "realtime",
    engine: "realtime",
    domain: "realtime",
    detect: () => drainDetectedViolations("realtime"),
  });
  recordPipelineRun(result);
  return result;
}

export function runSecurityPipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "security",
    engine: "security",
    domain: "auth",
    detect: () => drainDetectedViolations("security"),
  });
  recordPipelineRun(result);
  return result;
}

export function runRepairPipeline(): PipelineRunResult {
  const result = executePipelineRun({
    id: "repair",
    engine: "repair",
    domain: "taxonomy",
    detect: () => drainDetectedViolations("repair"),
  });
  recordPipelineRun(result);
  return result;
}

export function runAllPipelines(): PipelineRunResult[] {
  return [
    runTaxonomyPipeline(),
    runAssetPipeline(),
    runDataPipeline(),
    runUiPipeline(),
    runFlowPipeline(),
    runRealtimePipeline(),
    runSecurityPipeline(),
    runRepairPipeline(),
  ];
}
