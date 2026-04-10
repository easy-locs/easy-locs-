export type {
  MediaFamily,
  MediaDomain,
  MediaValidationResult,
  MediaIssue,
  ImageMetadata,
  EntityQualityInput,
  EntityQualityReport,
  FallbackImage,
  StoryValidationResult,
  StoryValidationIssue,
  FeedValidationResult,
} from "./types";

export {
  MEDIA_FAMILY_REGISTRY,
  getDomainForVertical,
  getDefaultFamilyForVertical,
  getFamilyDomain,
  isMediaFamilyCompatible,
  classifyMediaFamily,
  getAllFamiliesForDomain,
} from "./media-families";

export {
  validateImage,
  validateEntityImages,
  getMediaValidationSummary,
  resetDuplicateTracker,
} from "./media-validator";

export {
  scoreEntityQuality,
  batchScoreEntities,
  filterPublishable,
  filterFeedEligible,
  filterStoryEligible,
} from "./entity-quality-scorer";

export {
  getDomainFallback,
  getFallbackForDomain,
  isFallbackSafe,
  isImageDomainSafe,
  resolveSafeImage,
  resolveEntityImage,
  getAllFallbacks,
} from "./fallback-resolver";

export {
  validateStory,
  validateStoryBatch,
} from "./story-validator";

export {
  validateFeedInsertion,
  validateFeedBatch,
  getAvailableFeeds,
  getFeedRules,
} from "./feed-validator";

export {
  logMediaValidation,
  logLowQualityEntity,
  logBlockedStory,
  logFeedRejection,
  logFallbackUsage,
  getValidationLogs,
  getValidationCounters,
  getValidationReport,
  clearValidationLogs,
} from "./validation-logger";
