import type { FeedValidationResult, EntityQualityInput } from "./types";
import { scoreEntityQuality } from "./entity-quality-scorer";

const FEED_DOMAIN_RULES: Record<string, { allowedVerticals: string[]; requireImage: boolean; minQuality: number }> = {
  property_buy_feed: { allowedVerticals: ["property"], requireImage: true, minQuality: 50 },
  property_rent_feed: { allowedVerticals: ["property"], requireImage: true, minQuality: 50 },
  property_project_feed: { allowedVerticals: ["property"], requireImage: true, minQuality: 50 },
  stay_hotel_feed: { allowedVerticals: ["stay"], requireImage: true, minQuality: 50 },
  stay_resort_feed: { allowedVerticals: ["stay"], requireImage: true, minQuality: 50 },
  stay_trending_feed: { allowedVerticals: ["stay"], requireImage: true, minQuality: 60 },
  food_pizza_feed: { allowedVerticals: ["food"], requireImage: true, minQuality: 40 },
  food_lebanese_feed: { allowedVerticals: ["food"], requireImage: true, minQuality: 40 },
  food_trending_feed: { allowedVerticals: ["food"], requireImage: true, minQuality: 50 },
  grocery_fruits_feed: { allowedVerticals: ["grocery"], requireImage: true, minQuality: 40 },
  grocery_snacks_feed: { allowedVerticals: ["grocery"], requireImage: true, minQuality: 40 },
  grocery_essentials_feed: { allowedVerticals: ["grocery"], requireImage: false, minQuality: 40 },
  utility_atm_feed: { allowedVerticals: ["utility"], requireImage: false, minQuality: 30 },
  utility_fuel_feed: { allowedVerticals: ["utility"], requireImage: false, minQuality: 30 },
  utility_open_now_feed: { allowedVerticals: ["utility"], requireImage: false, minQuality: 30 },
  mobility_feed: { allowedVerticals: ["mobility", "taxi", "delivery"], requireImage: false, minQuality: 30 },
  services_plumbing_feed: { allowedVerticals: ["services"], requireImage: false, minQuality: 40 },
  services_electrical_feed: { allowedVerticals: ["services"], requireImage: false, minQuality: 40 },
  services_urgent_feed: { allowedVerticals: ["services"], requireImage: false, minQuality: 30 },
  dashboard_for_you: { allowedVerticals: ["food", "grocery", "property", "stay", "services", "utility", "mobility", "shops", "beauty", "taxi", "delivery", "pharmacy", "experiences"], requireImage: true, minQuality: 50 },
  dashboard_continue_exploring: { allowedVerticals: ["food", "grocery", "property", "stay", "services", "utility", "mobility", "shops", "beauty", "taxi", "delivery", "pharmacy", "experiences"], requireImage: true, minQuality: 40 },
  radar_nearby_food: { allowedVerticals: ["food"], requireImage: true, minQuality: 40 },
  radar_nearby_utility: { allowedVerticals: ["utility"], requireImage: false, minQuality: 30 },
  wallet_recent_actions_feed: { allowedVerticals: ["food", "grocery", "property", "stay", "services", "utility", "mobility", "shops", "beauty", "taxi", "delivery", "pharmacy", "experiences"], requireImage: false, minQuality: 0 },
  orbit_priority_threads_feed: { allowedVerticals: ["food", "grocery", "property", "stay", "services", "utility", "mobility", "shops", "beauty", "taxi", "delivery", "pharmacy", "experiences"], requireImage: false, minQuality: 0 },
};

interface FeedCandidateInput {
  entityId: string;
  vertical: string;
  feedKey: string;
  hasImage: boolean;
  intentType?: string;
  qualityInput?: EntityQualityInput;
}

export function validateFeedInsertion(candidate: FeedCandidateInput): FeedValidationResult {
  const rules = FEED_DOMAIN_RULES[candidate.feedKey];

  const entityValid = !!candidate.entityId && candidate.entityId.length > 0;

  if (!rules) {
    return {
      entityId: candidate.entityId,
      feedKey: candidate.feedKey,
      accepted: false,
      rejectReason: `Unknown feed "${candidate.feedKey}" — not in registered feed rules`,
      checks: { entityValid, imageValid: false, taxonomyValid: false, intentValid: false, qualityAboveThreshold: false },
    };
  }

  const taxonomyValid = rules.allowedVerticals.includes(candidate.vertical);

  let imageValid = true;
  if (rules?.requireImage && !candidate.hasImage) {
    imageValid = false;
  }

  let intentValid = true;
  if (candidate.intentType) {
    const intentVerticalMap: Record<string, string[]> = {
      buy_property: ["property"],
      rent_property: ["property"],
      project_property: ["property"],
      stay_booking: ["stay"],
      food_order: ["food"],
      grocery_order: ["grocery"],
      service_request: ["services"],
      ride_request: ["mobility", "taxi", "delivery"],
      wallet_transfer: ["food", "grocery", "property", "stay", "services", "utility", "mobility", "shops", "beauty", "taxi", "delivery", "pharmacy", "experiences"],
      support_request: ["food", "grocery", "property", "stay", "services", "utility", "mobility", "shops", "beauty", "taxi", "delivery", "pharmacy", "experiences"],
    };
    const allowed = intentVerticalMap[candidate.intentType];
    if (allowed && !allowed.includes(candidate.vertical)) {
      intentValid = false;
    }
  }

  let qualityAboveThreshold = true;
  if (candidate.qualityInput && rules) {
    const report = scoreEntityQuality(candidate.qualityInput);
    if (report.score < rules.minQuality) {
      qualityAboveThreshold = false;
    }
  }

  const accepted = entityValid && taxonomyValid && imageValid && intentValid && qualityAboveThreshold;

  let rejectReason: string | null = null;
  if (!accepted) {
    if (!entityValid) rejectReason = "Invalid entity ID";
    else if (!taxonomyValid) rejectReason = `Vertical "${candidate.vertical}" not allowed in feed "${candidate.feedKey}"`;
    else if (!imageValid) rejectReason = "Feed requires image but entity has none";
    else if (!intentValid) rejectReason = `Intent "${candidate.intentType}" incompatible with vertical "${candidate.vertical}"`;
    else if (!qualityAboveThreshold) rejectReason = `Entity quality below feed threshold (min: ${rules?.minQuality ?? 0})`;
  }

  return {
    entityId: candidate.entityId,
    feedKey: candidate.feedKey,
    accepted,
    rejectReason,
    checks: { entityValid, imageValid, taxonomyValid, intentValid, qualityAboveThreshold },
  };
}

export function validateFeedBatch(
  candidates: FeedCandidateInput[],
): { accepted: FeedValidationResult[]; rejected: FeedValidationResult[] } {
  const results = candidates.map(validateFeedInsertion);
  return {
    accepted: results.filter((r) => r.accepted),
    rejected: results.filter((r) => !r.accepted),
  };
}

export function getAvailableFeeds(): string[] {
  return Object.keys(FEED_DOMAIN_RULES);
}

export function getFeedRules(feedKey: string) {
  return FEED_DOMAIN_RULES[feedKey] ?? null;
}
