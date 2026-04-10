/**
 * output.audit_trace.build — Builds the full forensic audit trace.
 * ONE thing: assemble step-level trace.
 */
import type { AuditTrace, RawInput, StepState, GovernanceLayerOutput, QualityReport, EntityProfile, PersistenceResult } from "../contracts";

export function buildAuditTrace(params: {
  runId: string;
  pipelineId: string;
  input: RawInput;
  steps: StepState[];
  profiles: EntityProfile[];
  qualityReports: QualityReport[];
  governanceDecisions: GovernanceLayerOutput[];
  persistence: PersistenceResult | null;
  totalDurationMs: number;
}): AuditTrace {
  return {
    runId: params.runId,
    pipelineId: params.pipelineId,
    input: params.input,
    steps: params.steps,
    entityProfiles: params.profiles,
    qualityReports: params.qualityReports,
    governanceDecisions: params.governanceDecisions,
    persistenceResults: params.persistence,
    totalDurationMs: params.totalDurationMs,
    completedAt: new Date().toISOString(),
  };
}
