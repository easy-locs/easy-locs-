import { platformBus } from "@/lib/shared/platform-bus";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import {
  executePipeline,
  enablePipeline,
  disablePipeline,
  type PipelineInput,
  type IssueCategory,
  type IssueSeverity,
} from "./repair-pipeline";
import { resetDomMutationCount } from "./repair-actions";
import type { RepairOperationType } from "./repair-actions";
import type { RepairLevel } from "./proof-system";
import { getProofStats } from "./proof-system";
import {
  type RepairPriority,
  comparePriority,
  getStormLevel,
  shouldSuppressByPriority,
  resetBudget,
  recordOverBudgetCycle,
  getBudgetState,
  getHardeningReport,
} from "./repair-hardening";

interface ViolationPayload {
  violations: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    source: string;
    code: string;
  }>;
  count: number;
  timestamp: number;
  findings?: string[];
}

interface UiEngineReportPayload {
  engineId?: string;
  issueCount?: number;
  issues?: Array<{ id: string; type: string; message?: string; severity?: string; patchable?: boolean }>;
}

interface IssueBatch {
  domain: string;
  engineId: string;
  issueSignature: string;
  category: IssueCategory;
  severity: IssueSeverity;
  rawSignal: string;
  suggestedOperation: RepairOperationType;
  suggestedTarget: string;
  repairLevel: RepairLevel;
  priority: RepairPriority;
  detectorCertainty: number;
  corroboratingSignals: number;
}

const DEBOUNCE_MS = 1000;
const MAX_BATCH_SIZE = 20;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBatches: IssueBatch[] = [];
let pipelineRunning = false;
let unsubscribers: (() => void)[] = [];
let totalBridgeRuns = 0;
let totalBridgeBlocked = 0;
let totalBridgeRejected = 0;

function mapUiIssueToBatch(issue: { id: string; type: string; message?: string; severity?: string }): IssueBatch | null {
  const type = issue.type;
  const message = issue.message ?? type;

  const mapping: Record<string, Omit<IssueBatch, "rawSignal" | "detectorCertainty" | "corroboratingSignals">> = {
    overflow_x: { domain: "ui", engineId: "layout-integrity", issueSignature: "overflow", category: "render", severity: "medium", suggestedOperation: "fallback", suggestedTarget: "el-ui-dom-patches", repairLevel: "L2", priority: "critical_layout" },
    overflow_y_clip: { domain: "ui", engineId: "layout-integrity", issueSignature: "clipping", category: "render", severity: "medium", suggestedOperation: "fallback", suggestedTarget: "el-ui-dom-patches", repairLevel: "L2", priority: "critical_layout" },
    text_clipping: { domain: "ui", engineId: "layout-integrity", issueSignature: "text-clip", category: "render", severity: "medium", suggestedOperation: "fallback", suggestedTarget: "el-ui-dom-patches", repairLevel: "L2", priority: "critical_layout" },
    element_overlap: { domain: "layout", engineId: "layout-integrity", issueSignature: "element-overlap", category: "render", severity: "medium", suggestedOperation: "fallback", suggestedTarget: "el-layout-overlaps", repairLevel: "L2", priority: "severe_visibility" },
    wrapper_strangling: { domain: "layout", engineId: "layout-integrity", issueSignature: "strangling", category: "render", severity: "medium", suggestedOperation: "fallback", suggestedTarget: "el-layout-overlaps", repairLevel: "L2", priority: "severe_visibility" },
    tiny_tap_targets: { domain: "ui", engineId: "layout-integrity", issueSignature: "tap-target", category: "render", severity: "low", suggestedOperation: "fallback", suggestedTarget: "el-ui-tap-targets", repairLevel: "L2", priority: "cosmetic_layout" },
    dotted_labels: { domain: "i18n", engineId: "localization-governance", issueSignature: "dotted-label", category: "render", severity: "low", suggestedOperation: "refresh", suggestedTarget: "el-i18n-patches", repairLevel: "L2", priority: "i18n_surface" },
    untranslated_keys: { domain: "i18n", engineId: "localization-governance", issueSignature: "untranslated", category: "render", severity: "low", suggestedOperation: "refresh", suggestedTarget: "el-i18n-patches", repairLevel: "L2", priority: "i18n_surface" },
    broken_card_layout: { domain: "layout", engineId: "layout-integrity", issueSignature: "card-layout", category: "render", severity: "medium", suggestedOperation: "fallback", suggestedTarget: "el-layout-cards", repairLevel: "L2", priority: "severe_visibility" },
  };

  const mapped = mapping[type];
  if (!mapped) return null;

  return { ...mapped, rawSignal: `${type}: ${message}`, detectorCertainty: 0.85, corroboratingSignals: 1 };
}

function mapViolationToBatch(domain: string, engineId: string, violation: ViolationPayload["violations"][0]): IssueBatch | null {
  if (domain === "text") {
    const isEncoding = /encoding|placeholder|broken/i.test(violation.message);
    return {
      domain: "text",
      engineId,
      issueSignature: isEncoding ? "encoding" : "text-truncation",
      category: isEncoding ? "data" : "render",
      severity: (violation.severity as IssueSeverity) || "medium",
      rawSignal: violation.message,
      suggestedOperation: isEncoding ? "invalidate" : "refresh",
      suggestedTarget: isEncoding ? "el-text-encoding" : "el-text-integrity",
      repairLevel: "L2",
      priority: "text_integrity",
      detectorCertainty: 0.8,
      corroboratingSignals: 1,
    };
  }

  if (domain === "layout") {
    const isOverflow = /overflow|clipping/i.test(violation.message);
    const isTapTarget = /touch|tap/i.test(violation.message);
    return {
      domain: isTapTarget ? "ui" : "layout",
      engineId,
      issueSignature: isOverflow ? "overflow" : isTapTarget ? "tap-target" : "layout-issue",
      category: "render",
      severity: (violation.severity as IssueSeverity) || "medium",
      rawSignal: violation.message,
      suggestedOperation: "fallback",
      suggestedTarget: isTapTarget ? "el-ui-tap-targets" : isOverflow ? "el-ui-dom-patches" : "el-layout-overlaps",
      repairLevel: "L2",
      priority: isTapTarget ? "cosmetic_layout" : isOverflow ? "critical_layout" : "severe_visibility",
      detectorCertainty: 0.75,
      corroboratingSignals: 1,
    };
  }

  if (domain === "i18n") {
    return {
      domain: "i18n",
      engineId,
      issueSignature: "untranslated",
      category: "render",
      severity: "low",
      rawSignal: violation.message,
      suggestedOperation: "refresh",
      suggestedTarget: "el-i18n-patches",
      repairLevel: "L2",
      priority: "i18n_surface",
      detectorCertainty: 0.8,
      corroboratingSignals: 1,
    };
  }

  return null;
}

function enqueueBatch(batch: IssueBatch): void {
  if (pendingBatches.length >= MAX_BATCH_SIZE) return;

  const storm = getStormLevel();
  if (shouldSuppressByPriority(batch.priority, storm)) {
    totalBridgeRejected++;
    return;
  }

  pendingBatches.push(batch);
  scheduleFlush();
}

function scheduleFlush(): void {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushBatches();
  }, DEBOUNCE_MS);
}

async function flushBatches(): Promise<void> {
  if (pipelineRunning || pendingBatches.length === 0) return;

  if (!isPlatformFlagEnabled("enable_repair_pipeline")) {
    totalBridgeBlocked += pendingBatches.length;
    pendingBatches = [];
    return;
  }

  pipelineRunning = true;
  const batches = [...pendingBatches];
  pendingBatches = [];

  batches.sort((a, b) => comparePriority(a.priority, b.priority));

  const byDomainTarget = new Map<string, IssueBatch[]>();
  for (const b of batches) {
    const key = `${b.domain}:${b.suggestedTarget}`;
    const existing = byDomainTarget.get(key) ?? [];
    existing.push(b);
    byDomainTarget.set(key, existing);
  }

  const storm = getStormLevel();
  resetBudget(1.0, storm);

  try {
    const sortedGroups = Array.from(byDomainTarget.entries()).sort((a, b) => {
      const pa = a[1][0].priority;
      const pb = b[1][0].priority;
      return comparePriority(pa, pb);
    });

    for (const [, group] of sortedGroups) {
      const representative = group[0];
      const rawSignal = group.map(b => b.rawSignal).join("; ").slice(0, 500);

      resetDomMutationCount();

      const elementId = `${representative.domain}:${representative.suggestedTarget}:${representative.issueSignature}`;

      const input: PipelineInput = {
        engineId: representative.engineId,
        domain: representative.domain,
        issueSignature: representative.issueSignature,
        repairChainId: `ui-repair-${representative.domain}-${Date.now()}`,
        category: representative.category,
        severity: representative.severity,
        rawSignal,
        suggestedOperation: representative.suggestedOperation,
        suggestedTarget: representative.suggestedTarget,
        repairLevel: representative.repairLevel,
        elementId,
        detectorCertainty: representative.detectorCertainty,
        corroboratingSignals: representative.corroboratingSignals,
      };

      enablePipeline();
      try {
        const result = await executePipeline(input);
        totalBridgeRuns++;

        if (result.rejectionReason === "budget_exceeded") {
          recordOverBudgetCycle();
        }
      } finally {
        disablePipeline();
      }
    }

    if (import.meta.env.DEV) {
      const stats = getProofStats();
      const hardening = getHardeningReport();
      console.log(`[ui-repair-bridge] Flushed ${batches.length} issues across ${sortedGroups.length} groups`, {
        ...stats,
        storm: hardening.storm.level,
        budgetRemaining: hardening.budget.remaining,
      });
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[ui-repair-bridge] Pipeline execution error:", err);
    }
  } finally {
    pipelineRunning = false;

    if (pendingBatches.length > 0) {
      scheduleFlush();
    }
  }
}

function handleUiEngineReport(payload: UiEngineReportPayload): void {
  if (!payload) return;

  if (payload.engineId === "auto-remediation") return;

  const issues = payload.issues ?? [];
  if (issues.length === 0 && (!payload.issueCount || payload.issueCount === 0)) return;

  for (const issue of issues) {
    const batch = mapUiIssueToBatch(issue);
    if (batch) enqueueBatch(batch);
  }
}

function handleTextViolation(payload: ViolationPayload): void {
  if (!payload?.violations?.length) return;

  for (const v of payload.violations) {
    const batch = mapViolationToBatch("text", "text-integrity", v);
    if (batch) enqueueBatch(batch);
  }
}

function handleLayoutViolation(payload: ViolationPayload): void {
  if (!payload?.violations?.length && !payload?.findings?.length) return;

  for (const v of (payload.violations ?? [])) {
    const batch = mapViolationToBatch("layout", "layout-integrity", v);
    if (batch) enqueueBatch(batch);
  }

  for (const finding of (payload.findings ?? [])) {
    const isOverflow = /overflow/i.test(finding);
    const isTouchTarget = /touch target|tap target/i.test(finding);
    enqueueBatch({
      domain: isTouchTarget ? "ui" : isOverflow ? "ui" : "layout",
      engineId: "layout-integrity",
      issueSignature: isTouchTarget ? "tap-target" : isOverflow ? "overflow" : "layout-issue",
      category: "render",
      severity: "medium",
      rawSignal: finding,
      suggestedOperation: "fallback",
      suggestedTarget: isTouchTarget ? "el-ui-tap-targets" : isOverflow ? "el-ui-dom-patches" : "el-layout-overlaps",
      repairLevel: "L2",
      priority: isTouchTarget ? "cosmetic_layout" : isOverflow ? "critical_layout" : "severe_visibility",
      detectorCertainty: 0.75,
      corroboratingSignals: 1,
    });
  }
}

function handleI18nViolation(payload: ViolationPayload): void {
  if (!payload?.violations?.length) return;

  for (const v of payload.violations) {
    const batch = mapViolationToBatch("i18n", "localization-governance", v);
    if (batch) enqueueBatch(batch);
  }
}

export function installUiRepairBridge(): () => void {
  if (unsubscribers.length > 0) {
    return () => teardownUiRepairBridge();
  }

  unsubscribers.push(
    platformBus.on("ui-engine:report", (event) => handleUiEngineReport(event.payload as UiEngineReportPayload)),
    platformBus.on("text:integrity_violation", (event) => handleTextViolation(event.payload as ViolationPayload)),
    platformBus.on("layout:integrity_violation", (event) => handleLayoutViolation(event.payload as ViolationPayload)),
    platformBus.on("i18n:localization_violation", (event) => handleI18nViolation(event.payload as ViolationPayload)),
  );

  if (import.meta.env.DEV) {
    console.log("[ui-repair-bridge] Installed — listening for ui-engine:report, text/layout/i18n violations");
  }

  return () => teardownUiRepairBridge();
}

function teardownUiRepairBridge(): void {
  for (const unsub of unsubscribers) unsub();
  unsubscribers = [];
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingBatches = [];
}

export function isUiRepairBridgeActive(): boolean {
  return unsubscribers.length > 0;
}

export function getUiRepairBridgeReport() {
  const hardening = getHardeningReport();
  return {
    listening: unsubscribers.length > 0,
    flagEnabled: isPlatformFlagEnabled("enable_repair_pipeline"),
    pendingBatches: pendingBatches.length,
    pipelineRunning,
    totalRuns: totalBridgeRuns,
    totalBlocked: totalBridgeBlocked,
    totalRejected: totalBridgeRejected,
    stormLevel: hardening.storm.level,
    budgetState: hardening.budget,
    cooldownEntries: hardening.cooldownEntries,
    oscillationQuarantines: hardening.oscillationQuarantines,
  };
}
