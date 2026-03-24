/**
 * Canonical Boost Engine — Public API re-exports.
 * Old ad-slots.ts consumers should migrate to this module.
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
