/**
 * ASSET GOVERNANCE SYSTEM — Unified Entry Point
 * ===============================================
 * Single import point for all asset governance functionality.
 * Wire this into ingestion, publish gates, UI rendering, and observability.
 */

export {
  VERTICAL_ASSET_GOVERNANCE,
  getVerticalGovernance,
  getAllVerticals,
  getVerticalFallbackPath,
  getVerticalFallbackGroup,
  getForbiddenVerticals,
  getMinScoreThreshold,
  type AssetVertical,
  type AssetType,
  type TrustLevel,
  type ModerationStatus,
  type PublishStatus,
  type VerticalAssetGovernance,
  type AssetMetadata,
  type BannerRule,
  type HeroRule,
} from "./asset-governance-taxonomy";

export {
  registerAsset,
  getAsset,
  isRegistered,
  isAssetQuarantined,
  quarantineAsset,
  unquarantineAsset,
  recordRepair,
  updateAssetStatus,
  getAllAssets,
  getAssetsForVertical,
  getPublishedAssetsForVertical,
  getBlockedAssets,
  getQuarantinedAssets,
  getFallbackAsset,
  getRepairLog,
  getRegistryStats,
  type RegistryAsset,
  type AssetRegistryStats,
} from "./asset-registry";

export {
  runBannerIntegrityPipeline,
  runBannerIntegrityPipelineBatch,
  getIncidentLog,
  getBlockedAssets as getPipelineBlockedAssets,
  getPipelineStats,
  type PipelineInput,
  type PipelineResult,
  type PipelineStage,
  type PipelineDecision,
  type PipelineStageResult,
} from "./banner-integrity-pipeline";

export {
  reportRuntimeBannerIssue,
  auditPublishedBannersForVertical,
  getIncidents,
  getUnresolvedIncidents,
  getSuppressedAssets,
  resolveIncident,
  getRuntimeMonitorStats,
  type RuntimeBannerIncident,
} from "./runtime-banner-monitor";

export {
  generateProofReport,
  printProofReport,
  type ProofReportSection,
  type AssetGovernanceProofReport,
} from "./asset-governance-proof-report";
