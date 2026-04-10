/**
 * Canonical Boost Engine — Public API re-exports.
 * Includes Smart Banner Orchestrator for unified multi-dimensional targeting.
 */
export {
  resolveBoostForSlot,
  resolveBoostsForSurface,
  trackBoostImpression,
  trackBoostClick,
  trackBoostLead,
  validateCampaign,
  validateCreative,
  type BoostCampaign,
  type BoostCreative,
  type BoostSlot,
  type BoostMatch,
  type SlotContext,
} from "./canonical-boost-engine";

export {
  resolveSmartBanners,
  buildTemporalContext,
  resolveTimePeriod,
  resolveSeason,
  validateGeoHierarchy,
  getSmartBannerDebugInfo,
  type SmartBanner,
  type SmartBannerContext,
  type GeoHierarchy,
  type TemporalContext,
  type WeatherContext,
  type WeatherCondition,
  type TimePeriod,
  type Season,
  type BannerSource,
} from "./smart-banner-orchestrator";
