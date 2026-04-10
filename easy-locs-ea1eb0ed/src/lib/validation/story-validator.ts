import type { StoryValidationResult, StoryValidationIssue, MediaFamily } from "./types";
import { isMediaFamilyCompatible, getDomainForVertical, classifyMediaFamily } from "./media-families";
import { scoreEntityQuality, type EntityQualityInput } from "./entity-quality-scorer";

interface StoryInput {
  storyId: string;
  entityId: string;
  entityType: string;
  vertical: string;
  categoryKey?: string;
  subcategoryKey?: string;
  intentType?: string;
  mediaFamily?: MediaFamily;
  mediaUrls: string[];
  title?: string;
  subtitle?: string;
  primaryCtaType?: string;
  primaryCtaLabel?: string;
  feedKey?: string;
  surfaceAllowed?: string[];
  entityQuality?: EntityQualityInput;
}

const FEED_DOMAIN_MAP: Record<string, string> = {
  property_buy_feed: "property",
  property_rent_feed: "property",
  property_project_feed: "property",
  stay_hotel_feed: "stay",
  stay_resort_feed: "stay",
  food_pizza_feed: "food",
  food_lebanese_feed: "food",
  food_trending_feed: "food",
  grocery_fruits_feed: "grocery",
  grocery_snacks_feed: "grocery",
  grocery_essentials_feed: "grocery",
  utility_atm_feed: "utility",
  utility_fuel_feed: "utility",
  utility_open_now_feed: "utility",
  mobility_feed: "mobility",
  services_plumbing_feed: "service",
  services_electrical_feed: "service",
  services_urgent_feed: "service",
  dashboard_for_you: "mixed",
  dashboard_continue_exploring: "mixed",
};

const INTENT_ENTITY_MAP: Record<string, string[]> = {
  buy_property: ["property"],
  rent_property: ["property"],
  project_property: ["property"],
  stay_booking: ["stay"],
  food_order: ["food"],
  grocery_order: ["grocery"],
  service_request: ["services", "service"],
  ride_request: ["mobility", "taxi"],
  wallet_transfer: ["wallet"],
  support_request: ["orbit"],
};

const STORY_QUALITY_THRESHOLD = 60;

export function validateStory(input: StoryInput): StoryValidationResult {
  const issues: StoryValidationIssue[] = [];

  if (!input.entityId) {
    issues.push({ field: "entityId", rule: "required", severity: "critical", detail: "Story must link to a real canonical entity." });
  }

  if (!input.vertical) {
    issues.push({ field: "vertical", rule: "required", severity: "critical", detail: "Story must have a vertical classification." });
  }

  if (!input.title || input.title.trim().length < 2) {
    issues.push({ field: "title", rule: "min_length", severity: "critical", detail: "Story must have a title of at least 2 characters." });
  }

  if (!input.mediaUrls || input.mediaUrls.length === 0) {
    issues.push({ field: "mediaUrls", rule: "required", severity: "critical", detail: "Story must have at least one media item." });
  }

  if (!input.primaryCtaType) {
    issues.push({ field: "primaryCtaType", rule: "required", severity: "warning", detail: "Story should have a primary CTA type." });
  }

  if (input.vertical && input.categoryKey) {
    const verticalDomain = getDomainForVertical(input.vertical);
    const categoryDomain = getDomainForVertical(input.categoryKey);
    if (verticalDomain !== categoryDomain && input.categoryKey !== input.vertical) {
      issues.push({
        field: "categoryKey",
        rule: "taxonomy_match",
        severity: "critical",
        detail: `Category "${input.categoryKey}" does not match vertical "${input.vertical}".`,
      });
    }
  }

  if (input.intentType && input.vertical) {
    const allowedVerticals = INTENT_ENTITY_MAP[input.intentType];
    if (allowedVerticals && !allowedVerticals.includes(input.vertical)) {
      issues.push({
        field: "intentType",
        rule: "intent_entity_match",
        severity: "critical",
        detail: `Intent "${input.intentType}" is not valid for vertical "${input.vertical}".`,
      });
    }
  }

  if (input.mediaFamily && input.vertical) {
    const entityExpected = classifyMediaFamily(input.title ?? "", input.vertical, input.subcategoryKey);
    if (!isMediaFamilyCompatible(input.mediaFamily, entityExpected)) {
      issues.push({
        field: "mediaFamily",
        rule: "media_entity_match",
        severity: "critical",
        detail: `Media family "${input.mediaFamily}" does not match entity expected family "${entityExpected}".`,
      });
    }
  }

  if (input.feedKey) {
    const feedDomain = FEED_DOMAIN_MAP[input.feedKey];
    if (feedDomain && feedDomain !== "mixed") {
      const storyDomain = getDomainForVertical(input.vertical);
      const feedDomainNormalized = feedDomain === "service" ? "service" : feedDomain;
      if (storyDomain !== feedDomainNormalized && input.vertical !== feedDomain) {
        issues.push({
          field: "feedKey",
          rule: "feed_domain_match",
          severity: "critical",
          detail: `Story vertical "${input.vertical}" cannot be inserted into feed "${input.feedKey}" (domain: ${feedDomain}).`,
        });
      }
    }
  }

  if (input.entityQuality) {
    const qualityReport = scoreEntityQuality(input.entityQuality);
    if (qualityReport.score < STORY_QUALITY_THRESHOLD) {
      issues.push({
        field: "entityQuality",
        rule: "quality_threshold",
        severity: "critical",
        detail: `Entity quality score ${qualityReport.score} is below story threshold ${STORY_QUALITY_THRESHOLD}.`,
      });
    }
  }

  const hasCritical = issues.some((i) => i.severity === "critical");
  const hasFeedBlock = issues.some(
    (i) => i.severity === "critical" && ["feed_domain_match", "taxonomy_match", "media_entity_match"].includes(i.rule),
  );

  return {
    valid: !hasCritical,
    issues,
    blockPublish: hasCritical,
    blockFeed: hasFeedBlock || hasCritical,
  };
}

export function validateStoryBatch(stories: StoryInput[]): { valid: StoryInput[]; blocked: { story: StoryInput; result: StoryValidationResult }[] } {
  const valid: StoryInput[] = [];
  const blocked: { story: StoryInput; result: StoryValidationResult }[] = [];

  for (const story of stories) {
    const result = validateStory(story);
    if (result.valid) {
      valid.push(story);
    } else {
      blocked.push({ story, result });
    }
  }

  return { valid, blocked };
}
