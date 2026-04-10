import type { EntityQualityInput, EntityQualityReport, MediaFamily } from "./types";
import { isMediaFamilyCompatible, getDefaultFamilyForVertical, getDomainForVertical } from "./media-families";

const QUALITY_TIERS = [
  { min: 90, tier: "premium" as const },
  { min: 70, tier: "good" as const },
  { min: 50, tier: "limited" as const },
  { min: 0, tier: "hidden" as const },
];

const FEED_THRESHOLD = 50;
const STORY_THRESHOLD = 60;
const PUBLISH_THRESHOLD = 40;

const VERTICAL_WEIGHTS: Record<string, Partial<Record<keyof EntityQualityReport["dimensions"], number>>> = {
  food: { profileCompleteness: 0.15, mediaCompleteness: 0.10, mediaQuality: 0.10, taxonomyCorrectness: 0.10, locationPrecision: 0.15, pricingCompleteness: 0.10, contactAvailability: 0.05, orbitReadiness: 0.10, walletReadiness: 0.05, reviewScore: 0.10 },
  property: { profileCompleteness: 0.15, mediaCompleteness: 0.15, mediaQuality: 0.15, taxonomyCorrectness: 0.10, locationPrecision: 0.15, pricingCompleteness: 0.10, contactAvailability: 0.05, orbitReadiness: 0.05, walletReadiness: 0.05, reviewScore: 0.05 },
  stay: { profileCompleteness: 0.10, mediaCompleteness: 0.15, mediaQuality: 0.15, taxonomyCorrectness: 0.10, locationPrecision: 0.10, pricingCompleteness: 0.15, contactAvailability: 0.05, orbitReadiness: 0.05, walletReadiness: 0.05, reviewScore: 0.10 },
};

const DEFAULT_WEIGHTS: Record<keyof EntityQualityReport["dimensions"], number> = {
  profileCompleteness: 0.15,
  mediaCompleteness: 0.10,
  mediaQuality: 0.10,
  taxonomyCorrectness: 0.10,
  locationPrecision: 0.15,
  pricingCompleteness: 0.10,
  contactAvailability: 0.10,
  orbitReadiness: 0.05,
  walletReadiness: 0.05,
  reviewScore: 0.10,
};

export function scoreEntityQuality(input: EntityQualityInput): EntityQualityReport {
  const issues: string[] = [];

  const profileCompleteness = scoreProfile(input, issues);
  const mediaCompleteness = scoreMediaCompleteness(input, issues);
  const mediaQuality = scoreMediaQuality(input, issues);
  const taxonomyCorrectness = scoreTaxonomy(input, issues);
  const locationPrecision = scoreLocation(input, issues);
  const pricingCompleteness = scorePricing(input, issues);
  const contactAvailability = scoreContact(input, issues);
  const orbitReadiness = input.orbitReady ? 100 : 0;
  const walletReadiness = input.walletReady ? 100 : 0;
  const reviewScore = scoreReviews(input);

  if (!input.orbitReady) issues.push("Orbit not connected");
  if (!input.walletReady) issues.push("Wallet not connected");

  const dimensions = {
    profileCompleteness,
    mediaCompleteness,
    mediaQuality,
    taxonomyCorrectness,
    locationPrecision,
    pricingCompleteness,
    contactAvailability,
    orbitReadiness,
    walletReadiness,
    reviewScore,
  };

  const weights = { ...DEFAULT_WEIGHTS, ...(VERTICAL_WEIGHTS[input.vertical] ?? {}) };

  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += dimensions[key as keyof typeof dimensions] * weight;
  }
  score = Math.round(score);

  const tier = QUALITY_TIERS.find((t) => score >= t.min)!.tier;

  return {
    entityId: input.entityId,
    score,
    tier,
    dimensions,
    issues,
    publishable: score >= PUBLISH_THRESHOLD,
    feedEligible: score >= FEED_THRESHOLD,
    storyEligible: score >= STORY_THRESHOLD,
  };
}

function scoreProfile(input: EntityQualityInput, issues: string[]): number {
  let s = 0;
  if (input.name && input.name.length >= 2) s += 30;
  else issues.push("Missing or short name");

  if (input.description && input.description.length >= 20) s += 30;
  else if (input.description) s += 15;
  else issues.push("Missing description");

  if (input.vertical) s += 20;
  else issues.push("Missing vertical");

  if (input.entityType) s += 20;
  else issues.push("Missing entity type");

  return Math.min(100, s);
}

function scoreMediaCompleteness(input: EntityQualityInput, issues: string[]): number {
  const photoCount = input.photos.length;
  if (photoCount === 0) {
    issues.push("No photos");
    return 0;
  }
  if (photoCount === 1) return 30;
  if (photoCount === 2) return 50;
  if (photoCount <= 4) return 70;
  if (photoCount <= 7) return 85;
  return 100;
}

function scoreMediaQuality(input: EntityQualityInput, issues: string[]): number {
  if (input.photos.length === 0) return 0;

  let s = 60;
  const hasLogo = !!input.logoUrl;
  if (hasLogo) s += 15;
  else issues.push("Missing logo");

  if (input.mediaFamilies && input.mediaFamilies.length > 0 && input.expectedMediaFamily) {
    const allMatch = input.mediaFamilies.every((f) =>
      isMediaFamilyCompatible(f, input.expectedMediaFamily!),
    );
    if (allMatch) s += 25;
    else {
      s -= 20;
      issues.push("Media family mismatch detected");
    }
  } else {
    s += 10;
  }

  return Math.max(0, Math.min(100, s));
}

function scoreTaxonomy(input: EntityQualityInput, issues: string[]): number {
  let s = 0;
  if (input.vertical) s += 40;
  else issues.push("Missing vertical classification");

  if (input.entityType) s += 30;
  else issues.push("Missing entity type classification");

  const domain = getDomainForVertical(input.vertical);
  const expectedFamily = input.expectedMediaFamily ?? getDefaultFamilyForVertical(input.vertical);
  const familyDomain = expectedFamily.split("_")[0];
  if (familyDomain === domain || domain === "food" && familyDomain === "food") {
    s += 30;
  } else {
    issues.push("Taxonomy-media domain mismatch");
  }

  return Math.min(100, s);
}

function scoreLocation(input: EntityQualityInput, issues: string[]): number {
  let s = 0;
  if (input.lat != null && input.lng != null) {
    s += 50;
    if (input.lat >= -90 && input.lat <= 90 && input.lng >= -180 && input.lng <= 180) {
      s += 10;
    }
  } else {
    issues.push("Missing coordinates");
  }

  if (input.address && input.address.length >= 5) s += 30;
  else issues.push("Missing or incomplete address");

  if (input.lat != null && input.lng != null && input.address) s += 10;

  return Math.min(100, s);
}

function scorePricing(input: EntityQualityInput, issues: string[]): number {
  const needsPrice = ["property", "stay", "food", "grocery", "shops"].includes(input.vertical);
  if (!needsPrice) return 80;

  let s = 0;
  if (input.price != null && input.price > 0) s += 60;
  else issues.push("Missing price information");

  if (input.currency) s += 20;
  if (input.menuItemCount || input.catalogItemCount || input.roomTypeCount) s += 20;

  return Math.min(100, s);
}

function scoreContact(input: EntityQualityInput, issues: string[]): number {
  let s = 0;
  if (input.phone) s += 50;
  else issues.push("Missing phone");
  if (input.email) s += 30;
  if (input.openingHours) s += 20;
  return Math.min(100, s);
}

function scoreReviews(input: EntityQualityInput): number {
  if (!input.rating) return 30;
  let s = 0;
  if (input.rating >= 4.5) s = 100;
  else if (input.rating >= 4.0) s = 80;
  else if (input.rating >= 3.5) s = 60;
  else if (input.rating >= 3.0) s = 40;
  else s = 20;

  if (input.reviewCount && input.reviewCount >= 50) s = Math.min(100, s + 10);
  else if (input.reviewCount && input.reviewCount >= 10) s = Math.min(100, s + 5);

  return s;
}

export function batchScoreEntities(inputs: EntityQualityInput[]): EntityQualityReport[] {
  return inputs.map(scoreEntityQuality);
}

export function filterPublishable(reports: EntityQualityReport[]): EntityQualityReport[] {
  return reports.filter((r) => r.publishable);
}

export function filterFeedEligible(reports: EntityQualityReport[]): EntityQualityReport[] {
  return reports.filter((r) => r.feedEligible);
}

export function filterStoryEligible(reports: EntityQualityReport[]): EntityQualityReport[] {
  return reports.filter((r) => r.storyEligible);
}
