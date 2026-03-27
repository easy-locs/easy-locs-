/**
 * Deliveroo Food Pipeline — Quality Scoring Engine
 */
import type {
  FoodQualityScores,
  FoodQualityResult,
  ContentStatus,
} from "./deliveroo-food-types";
import { QUALITY_THRESHOLDS, BLOCKED_CATEGORIES } from "./deliveroo-food-types";
import { isPlaceholderImage, hasValidCoordinates } from "./deliveroo-food-utils";

interface QualityInput {
  name: string;
  slug: string;
  source_entity_id: string;
  category: string;
  subcategory: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  logo_image: string | null;
  cover_image: string | null;
  menu_items_count: number;
  menu_categories_count: number;
  has_valid_prices: boolean;
  source: string;
  source_last_scraped_at: string | null;
  duplicate_cover: boolean;
}

export function computeIdentityScore(input: QualityInput): number {
  let score = 0;
  if (input.name && input.name.length >= QUALITY_THRESHOLDS.min_name_length) score += 5;
  if (input.slug) score += 3;
  if (input.source_entity_id) score += 4;
  if (input.category && !(BLOCKED_CATEGORIES as readonly string[]).includes(input.category.toLowerCase())) score += 4;
  if (input.subcategory && input.subcategory !== "casual_dining") score += 4;
  return Math.min(score, 20);
}

export function computeLocationScore(input: QualityInput): number {
  let score = 0;
  if (input.address) score += 6;
  if (hasValidCoordinates(input.latitude, input.longitude)) score += 8;
  if (input.city?.toLowerCase() === "dubai") score += 3;
  if (input.country) score += 3;
  return Math.min(score, 20);
}

export function computeVisualScore(input: QualityInput): number {
  let score = 0;
  if (input.logo_image && !isPlaceholderImage(input.logo_image)) score += 7;
  if (input.cover_image && !isPlaceholderImage(input.cover_image)) score += 8;
  if (!input.duplicate_cover) score += 5;
  return Math.min(score, 20);
}

export function computeMenuScore(input: QualityInput): number {
  let score = 0;
  if (input.menu_categories_count >= 1) score += 5;
  if (input.menu_categories_count >= 3) score += 5;
  if (input.menu_items_count >= QUALITY_THRESHOLDS.min_menu_items_food) score += 8;
  if (input.menu_items_count >= 10) score += 5;
  if (input.has_valid_prices) score += 7;
  return Math.min(score, 30);
}

export function computeSourceScore(input: QualityInput): number {
  let score = 0;
  if (input.source === "deliveroo") score += 6;
  if (input.source_last_scraped_at) {
    const age = Date.now() - new Date(input.source_last_scraped_at).getTime();
    const dayMs = 86400000;
    if (age < 1 * dayMs) score += 4;
    else if (age < 3 * dayMs) score += 2;
  }
  return Math.min(score, 10);
}

export function buildGateFailures(input: QualityInput): string[] {
  const failures: string[] = [];

  if (!input.name || input.name.length < QUALITY_THRESHOLDS.min_name_length)
    failures.push("missing_name");
  if ((BLOCKED_CATEGORIES as readonly string[]).includes((input.category || "").toLowerCase()))
    failures.push("invalid_category");
  if (!input.cover_image || isPlaceholderImage(input.cover_image))
    failures.push("invalid_cover");
  if (!input.logo_image || isPlaceholderImage(input.logo_image))
    failures.push("invalid_logo");
  if (!hasValidCoordinates(input.latitude, input.longitude))
    failures.push("missing_coordinates");
  if (!input.address)
    failures.push("missing_address");
  if (input.menu_items_count < QUALITY_THRESHOLDS.min_menu_items_food)
    failures.push("insufficient_menu_items");
  if (input.duplicate_cover)
    failures.push("duplicate_cover");

  return failures;
}

export function computeFoodQualityScore(input: QualityInput): FoodQualityResult {
  const scores: FoodQualityScores = {
    identity_score: computeIdentityScore(input),
    location_score: computeLocationScore(input),
    visual_score: computeVisualScore(input),
    menu_score: computeMenuScore(input),
    source_score: computeSourceScore(input),
    overall: 0,
  };
  scores.overall =
    scores.identity_score +
    scores.location_score +
    scores.visual_score +
    scores.menu_score +
    scores.source_score;

  const gate_failures = buildGateFailures(input);

  let content_status: ContentStatus = "empty";
  if (scores.overall >= 70 && gate_failures.length === 0) content_status = "premium_ready";
  else if (scores.overall >= 50) content_status = "ready";
  else if (scores.overall >= 25) content_status = "partial";

  return { scores, gate_failures, content_status };
}
