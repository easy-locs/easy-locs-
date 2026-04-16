/**
 * Autonomous Execution Layer — Phase 1 Core Pipeline (task #710).
 *
 * Public surface: dispatcher, validation engine, orchestrator adapter,
 * and the explicit risk-classification table. Wallet/auth/schema/deployment/
 * code-patch/secret/financial mutations are CRITICAL by design and cannot
 * autonomously execute in this phase.
 */

export * from "./risk-classification";
export * from "./allowed-domains";
export * from "./types";
export { ValidationEngine, validationEngine } from "./validation-engine";
export { TaskDispatcher, taskDispatcher } from "./task-dispatcher";
export {
  OrchestratorAdapter,
  orchestratorAdapter,
  NullOrchestratorTransport,
  type OrchestratorTransport,
  type OrchestratorResponse,
} from "./orchestrator-adapter";
// Phase-2 (task #750) — v2 transition matrix mirror.
export {
  TASK_TRANSITIONS,
  assertTaskTransition,
  isTerminalStatus,
  type TransitionAssertion,
} from "./transitions";
// Phase-2 (task #751) — locks & idempotency primitives.
export {
  getTaskLockKey,
  acquireExecutionLock,
  releaseExecutionLock,
  withExecutionLock,
  type TaskLockTarget,
  type LockHandle,
  type LockAcquireResult,
  type WithExecutionLockResult,
  type WithExecutionLockOptions,
} from "./lock-service";
export {
  computeIdempotencyKey,
  claimIdempotencyKey,
  findExistingResult,
  type IdempotencyKeyInput,
  type IdempotencyClaimResult,
  type ExistingResult,
} from "./idempotency-service";
