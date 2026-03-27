/**
 * Deliveroo Food Pipeline — Visibility Decision Engine
 */
import type {
  FoodVisibilityDecision,
  VisibilityMode,
  FoodQualityResult,
} from "./deliveroo-food-types";
import { QUALITY_THRESHOLDS } from "./deliveroo-food-types";

interface VisibilityInput {
  quality: FoodQualityResult;
  has_valid_identity: boolean;  // name + category valid
  has_valid_location: boolean;  // address + coords valid
  has_valid_source: boolean;    // source = deliveroo
}

export function decideFoodVisibility(input: VisibilityInput): FoodVisibilityDecision {
  const { quality, has_valid_identity, has_valid_location, has_valid_source } = input;
  const { scores, gate_failures } = quality;
  const overall = scores.overall;

  // ── HIDDEN ──
  if (overall < QUALITY_THRESHOLDS.min_for_coming_soon || !has_valid_source) {
    return {
      visibility_mode: "hidden",
      is_published: false,
      is_coming_soon: false,
      publish_gate_status: "failed",
      blocking_reason: `Score ${overall} below ${QUALITY_THRESHOLDS.min_for_coming_soon} or invalid source`,
      gate_failures,
      visibility_decision_reason: `overall=${overall}, threshold=${QUALITY_THRESHOLDS.min_for_coming_soon}`,
    };
  }

  // ── COMING SOON ──
  // Good identity+location but insufficient menu or visuals
  if (
    has_valid_identity &&
    has_valid_location &&
    (scores.menu_score < 20 || scores.visual_score < 10)
  ) {
    return {
      visibility_mode: "coming_soon",
      is_published: true,
      is_coming_soon: true,
      publish_gate_status: "passed",
      blocking_reason: null,
      gate_failures,
      visibility_decision_reason: `identity+location ok, menu=${scores.menu_score}/30, visual=${scores.visual_score}/20 → coming_soon`,
    };
  }

  // ── SEARCH ONLY ──
  if (overall >= QUALITY_THRESHOLDS.min_for_search_only && overall < QUALITY_THRESHOLDS.min_for_live) {
    return {
      visibility_mode: "search_only",
      is_published: true,
      is_coming_soon: false,
      publish_gate_status: "passed",
      blocking_reason: null,
      gate_failures,
      visibility_decision_reason: `overall=${overall} → search_only (${QUALITY_THRESHOLDS.min_for_search_only}–${QUALITY_THRESHOLDS.min_for_live})`,
    };
  }

  // ── LIVE ──
  if (overall >= QUALITY_THRESHOLDS.min_for_live && gate_failures.length === 0) {
    return {
      visibility_mode: "live",
      is_published: true,
      is_coming_soon: false,
      publish_gate_status: "passed",
      blocking_reason: null,
      gate_failures: [],
      visibility_decision_reason: `overall=${overall}, no gate failures → live`,
    };
  }

  // ── Fallback: score high but gate failures ──
  const mode: VisibilityMode = overall >= QUALITY_THRESHOLDS.min_for_search_only ? "search_only" : "coming_soon";
  return {
    visibility_mode: mode,
    is_published: true,
    is_coming_soon: mode === "coming_soon",
    publish_gate_status: gate_failures.length > 0 ? "failed" : "passed",
    blocking_reason: gate_failures.length > 0 ? gate_failures.join(", ") : null,
    gate_failures,
    visibility_decision_reason: `overall=${overall}, failures=${gate_failures.length} → ${mode}`,
  };
}
