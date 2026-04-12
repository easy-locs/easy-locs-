import { scrubSensitiveData } from "./repair-safety";
import type { RepairPriority, MutationCost, StormLevel, RejectionReason, ConfidenceSignals } from "./repair-hardening";

export type ProofOutcome = "accepted" | "rolled_back" | "timed_out" | "blocked" | "failed_validation" | "failed_regression" | "rejected";

export type RepairLevel = "L1" | "L2" | "L3" | "L4";

export interface DetectionSignal {
  engineId: string;
  domain: string;
  issueSignature: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: number;
  rawSignal: string;
}

export interface RootCause {
  component: string;
  category: string;
  description: string;
  confidence: number;
}

export interface MutationRecord {
  operation: string;
  target: string;
  beforeState: string;
  afterState: string;
  appliedAt: number;
  rolledBackAt: number | null;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  detail: string;
  checkedAt: number;
}

export interface ProofRecord {
  id: string;
  repairChainId: string;
  pipelineRunId: string;
  engineId: string;
  domain: string;
  repairLevel: RepairLevel;
  detection: DetectionSignal;
  rootCause: RootCause | null;
  mutation: MutationRecord | null;
  validationChecks: ValidationCheck[];
  regressionChecks: ValidationCheck[];
  outcome: ProofOutcome;
  stages: StageRecord[];
  startedAt: number;
  completedAt: number;
  durationMs: number;
  rollbackCapable: boolean;
  rolledBack: boolean;
  ruleId: string | null;
  priority: RepairPriority | null;
  confidence: number | null;
  confidenceThreshold: number | null;
  confidenceSignals: ConfidenceSignals | null;
  budgetCost: MutationCost | null;
  budgetRemaining: number | null;
  cooldownState: string | null;
  stormState: StormLevel | null;
  rejectionReason: RejectionReason | null;
  elementId: string | null;
}

export interface StageRecord {
  stage: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  result: "passed" | "failed" | "skipped" | "timed_out";
  detail: string;
}

const MEMORY_BUFFER_SIZE = 1000;
const LOCAL_STORAGE_SIZE = 100;
const STORAGE_KEY = "el-repair-proofs";

const proofBuffer: ProofRecord[] = [];

let proofCounter = 0;

export function generateProofId(): string {
  proofCounter++;
  return `proof-${Date.now()}-${proofCounter}`;
}

export function generatePipelineRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordProof(proof: ProofRecord): void {
  const scrubbed = scrubProof(proof);
  proofBuffer.push(scrubbed);
  if (proofBuffer.length > MEMORY_BUFFER_SIZE) {
    proofBuffer.splice(0, proofBuffer.length - MEMORY_BUFFER_SIZE);
  }
  persistToLocalStorage(scrubbed);
}

function scrubProof(proof: ProofRecord): ProofRecord {
  return {
    ...proof,
    detection: {
      ...proof.detection,
      rawSignal: scrubSensitiveData(proof.detection.rawSignal),
    },
    rootCause: proof.rootCause
      ? { ...proof.rootCause, description: scrubSensitiveData(proof.rootCause.description) }
      : null,
    mutation: proof.mutation
      ? {
          ...proof.mutation,
          beforeState: scrubSensitiveData(proof.mutation.beforeState),
          afterState: scrubSensitiveData(proof.mutation.afterState),
        }
      : null,
    validationChecks: proof.validationChecks.map(c => ({
      ...c,
      detail: scrubSensitiveData(c.detail),
    })),
    regressionChecks: proof.regressionChecks.map(c => ({
      ...c,
      detail: scrubSensitiveData(c.detail),
    })),
    stages: proof.stages.map(s => ({
      ...s,
      detail: scrubSensitiveData(s.detail),
    })),
  };
}

function persistToLocalStorage(proof: ProofRecord): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let records: ProofRecord[] = [];
    if (raw) {
      try {
        records = JSON.parse(raw);
      } catch {}
    }
    records.push(proof);
    if (records.length > LOCAL_STORAGE_SIZE) {
      records.splice(0, records.length - LOCAL_STORAGE_SIZE);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

function cloneProof(p: ProofRecord): ProofRecord {
  return JSON.parse(JSON.stringify(p));
}

function cloneProofs(records: ProofRecord[]): ProofRecord[] {
  return records.map(cloneProof);
}

export function getProofsByEngine(engineId: string): ProofRecord[] {
  return cloneProofs(proofBuffer.filter(p => p.engineId === engineId));
}

export function getProofsByDomain(domain: string): ProofRecord[] {
  return cloneProofs(proofBuffer.filter(p => p.domain === domain));
}

export function getProofsByOutcome(outcome: ProofOutcome): ProofRecord[] {
  return cloneProofs(proofBuffer.filter(p => p.outcome === outcome));
}

export function getProofById(id: string): ProofRecord | undefined {
  const found = proofBuffer.find(p => p.id === id);
  return found ? cloneProof(found) : undefined;
}

export function getProofsByPipelineRun(pipelineRunId: string): ProofRecord[] {
  return cloneProofs(proofBuffer.filter(p => p.pipelineRunId === pipelineRunId));
}

export function getRecentProofs(count = 50): ProofRecord[] {
  return cloneProofs(proofBuffer.slice(-count));
}

export function getRejectedProofs(): ProofRecord[] {
  return cloneProofs(proofBuffer.filter(p => p.outcome === "rejected" || p.outcome === "blocked"));
}

export function getProofStats() {
  const total = proofBuffer.length;
  const outcomes: Record<ProofOutcome, number> = {
    accepted: 0,
    rolled_back: 0,
    timed_out: 0,
    blocked: 0,
    failed_validation: 0,
    failed_regression: 0,
    rejected: 0,
  };

  const rejectionReasons: Record<string, number> = {};
  const byDomain = new Map<string, number>();
  const byEngine = new Map<string, number>();
  let totalDurationMs = 0;
  let rollbackCount = 0;
  let totalBudgetConsumed = 0;

  for (const p of proofBuffer) {
    outcomes[p.outcome]++;
    byDomain.set(p.domain, (byDomain.get(p.domain) || 0) + 1);
    byEngine.set(p.engineId, (byEngine.get(p.engineId) || 0) + 1);
    totalDurationMs += p.durationMs;
    if (p.rolledBack) rollbackCount++;
    if (p.budgetCost && p.outcome === "accepted") totalBudgetConsumed += p.budgetCost;
    if (p.rejectionReason) {
      rejectionReasons[p.rejectionReason] = (rejectionReasons[p.rejectionReason] || 0) + 1;
    }
  }

  return {
    total,
    bufferCapacity: MEMORY_BUFFER_SIZE,
    outcomes,
    rejectionReasons,
    byDomain: Object.fromEntries(byDomain),
    byEngine: Object.fromEntries(byEngine),
    averageDurationMs: total > 0 ? Math.round(totalDurationMs / total) : 0,
    rollbackCount,
    rollbackRate: total > 0 ? Math.round((rollbackCount / total) * 10000) / 10000 : 0,
    totalBudgetConsumed,
    rejectedByConfidence: rejectionReasons["insufficient_confidence"] ?? 0,
    rejectedByCooldown: rejectionReasons["cooldown_active"] ?? 0,
    rejectedByBudget: rejectionReasons["budget_exceeded"] ?? 0,
    rejectedByStorm: rejectionReasons["storm_suppressed"] ?? 0,
    successfulValidationCount: outcomes["accepted"],
    failedValidationCount: outcomes["failed_validation"] + outcomes["failed_regression"],
  };
}

export function loadPersistedProofs(): ProofRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function clearProofBuffer(): void {
  proofBuffer.length = 0;
}

export function clearPersistedProofs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
