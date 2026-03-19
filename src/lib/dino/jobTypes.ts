/**
 * DINO Job & Entity type definitions for the sync layer.
 */

export type DinoJobType =
  | "audit_route"
  | "audit_entity"
  | "normalize_media"
  | "sanitize_labels"
  | "cleanup_categories"
  | "score_quality"
  | "send_pro_reminder"
  | "send_user_recovery"
  | "rebuild_onboarding"
  | "refresh_market_theme";

export type DinoEntityType =
  | "route"
  | "restaurant"
  | "property"
  | "travel"
  | "service_provider"
  | "shop"
  | "category"
  | "onboarding_flow"
  | "user"
  | "pro";
