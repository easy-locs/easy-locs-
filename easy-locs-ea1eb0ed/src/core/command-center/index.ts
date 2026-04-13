/**
 * Central Engine Command Center — Main Entry Point
 *
 * Exports all 4 discipline pillars:
 * 1. CentralEngineCommandCenter — lifecycle governance
 * 2. EngineContract — mandatory contract spec
 * 3. LearningGovernance — validated learning chain
 * 4. AutoRepairRealityLock — 10-step repair pipeline
 */

export {
  centralEngineCommandCenter,
  type EngineRegistration,
  type LifecycleStateTransition,
  type CommandCenterStats,
  type EngineRunApproval,
} from "./central-engine-command-center";

export {
  type EngineContract,
  type EngineLifecycleState,
  type EngineTrustLevel,
  type EngineExecutionMode,
  type EngineRetryPolicy,
  type EngineRollbackPolicy,
  type EngineQuarantinePolicy,
  type EngineHealthCheckConfig,
  type ContractValidationResult,
  validateEngineContract,
  createDefaultContract,
} from "./engine-contract";

export {
  learningGovernance,
  buildLearningChainContext,
  buildSystemChainContext,
  type LearningChainContext,
  type LearningChainStage,
  type MemoryLayer,
  type ForbiddenLearningSource,
  type LearningValidationResult,
  type GovernedMemoryWrite,
} from "./learning-governance";

export {
  autoRepairRealityLock,
  type RepairPipelineStep,
  type RepairOutcome,
  type RepairProofRecord,
  type RepairRootCause,
  type RepairImpactScope,
  type RepairBeforeAfterState,
  type RepairRequest,
  type SimulationResult,
  type RepairValidationCheck,
  type RollbackRecord,
  type ForbiddenPatchType,
} from "./auto-repair-reality-lock";

export {
  bootCommandCenter,
  shutdownCommandCenter,
  executePurgePlan,
  requestEngineRunApproval,
  reportEngineRunSuccess,
  reportEngineRunError,
  registerNewEngine,
  getCommandCenterStatus,
  validateContract,
  type CommandCenterBootReport,
  type PurgePlanReport,
} from "./command-center-bootstrap";

export {
  ALL_ENGINE_CONTRACTS,
  getEngineContract,
} from "./engine-contracts-registry";
