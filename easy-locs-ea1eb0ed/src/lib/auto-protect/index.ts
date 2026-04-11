export type {
  ProtectionSeverity,
  ProtectionAction,
  ProtectionDomain,
  IssueCategory,
  DetectedIssue,
  ProtectionReaction,
  ProtectionReport,
  SafeAutoFixRule,
} from "./types";

export {
  protectRender,
  protectTaxonomy,
  protectMedia,
  protectPipeline,
  protectImport,
  protectWalletFlow,
  protectOtpFlow,
  protectAuthFlow,
  protectOrbitThread,
  protectPublicPage,
  protectCard,
  isOtpRateLimited,
  isTransferRateLimited,
  checkTransferRateLimit,
} from "./domain-protectors";

export {
  reactToIssue,
  processDetectedIssues,
} from "./protection-reactor";

export {
  attemptSafeAutoFix,
  isSafeToAutoFix,
  registerSafeFixRule,
} from "./safe-auto-fix";

export {
  checkRateLimit,
  peekRateLimit,
  isRateLimited,
  getRateLimitRemaining,
  resetRateLimit,
  getRateLimitStats,
} from "./rate-limiter";

export {
  getProtectionLog,
  getProtectionStats,
} from "./protection-logger";

export {
  verifyProtectionAction,
  runPostActionVerification,
} from "./verification";

export {
  detectRenderMismatch,
  detectTaxonomyMismatch,
  detectMediaIssues,
  detectPipelineIssues,
  detectImportIssues,
  detectWalletInconsistency,
  detectOtpAbuse,
  detectSuspiciousAuth,
  detectOrbitCorruption,
  detectPublicPageInvalid,
  detectCardBroken,
} from "./issue-detector";
