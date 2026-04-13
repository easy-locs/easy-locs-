/**
 * listing-quality-engine — Continuous listing quality assessment.
 * Checks completeness, title quality, description quality, correct category,
 * media accuracy, pricing logic, and readiness for publication.
 */

import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { isValidVertical } from "./taxonomy-guard";

export interface ListingQualityScore {
  listingId: string;
  scores: {
    completeness: number;
    titleQuality: number;
    descriptionQuality: number;
    mediaQuality: number;
    pricingQuality: number;
    categoryAccuracy: number;
  };
  totalScore: number;
  readyToPublish: boolean;
  issues: string[];
  assessedAt: string;
}

export interface ListingQualityReport {
  totalListings: number;
  publishReady: number;
  needsWork: number;
  blocked: number;
  averageScore: number;
  topIssues: string[];
  assessedAt: string;
}

const PUBLISH_THRESHOLD = 50;

let totalAssessed = 0;
let totalBlocked = 0;

function trackListingAssessmentInternal(blocked: boolean) {
  totalAssessed++;
  if (blocked) totalBlocked++;
}

export function assessListing(listing: {
  id: string;
  title?: string;
  description?: string;
  vertical?: string;
  category?: string;
  price?: number;
  currency?: string;
  images?: string[];
  phone?: string;
  address?: string;
  location?: { lat: number; lng: number };
  availability?: boolean;
  attributes?: Record<string, unknown>;
}): ListingQualityScore {
  const issues: string[] = [];
  const now = new Date().toISOString();

  let completeness = 0;
  const requiredFields = ["title", "description", "vertical", "price", "images"] as const;
  let filled = 0;
  for (const field of requiredFields) {
    const val = listing[field];
    if (val !== undefined && val !== null && val !== "") {
      if (Array.isArray(val) && val.length === 0) {
        issues.push(`Missing ${field}`);
      } else {
        filled++;
      }
    } else {
      issues.push(`Missing ${field}`);
    }
  }
  completeness = Math.round((filled / requiredFields.length) * 100);

  let titleQuality = 0;
  if (listing.title) {
    const t = listing.title.trim();
    if (t.length >= 3) titleQuality += 30;
    if (t.length >= 10) titleQuality += 20;
    if (t.length >= 20) titleQuality += 10;
    if (/^[A-Z]/.test(t)) titleQuality += 10;
    if (!/test|placeholder|sample|todo/i.test(t)) titleQuality += 30;
    else issues.push("Title appears to be placeholder text");
  }

  let descriptionQuality = 0;
  if (listing.description) {
    const d = listing.description.trim();
    if (d.length >= 15) descriptionQuality += 30;
    if (d.length >= 50) descriptionQuality += 20;
    if (d.length >= 100) descriptionQuality += 20;
    if (!/test|placeholder|sample|lorem/i.test(d)) descriptionQuality += 30;
    else issues.push("Description appears to be placeholder");
  } else {
    issues.push("No description provided");
  }

  let mediaQuality = 0;
  if (listing.images && listing.images.length > 0) {
    mediaQuality += 40;
    if (listing.images.length >= 3) mediaQuality += 20;
    if (listing.images.length >= 5) mediaQuality += 10;
    const uniqueImages = new Set(listing.images);
    if (uniqueImages.size === listing.images.length) mediaQuality += 30;
    else {
      mediaQuality -= 20;
      issues.push("Duplicate images detected");
    }
  } else {
    issues.push("No images provided");
  }

  let pricingQuality = 50;
  if (listing.price !== undefined) {
    if (listing.price > 0) pricingQuality += 30;
    if (listing.currency) pricingQuality += 20;
    else issues.push("Price currency not specified");
  } else {
    pricingQuality = 0;
    issues.push("No price set");
  }

  let categoryAccuracy = 100;
  if (!listing.vertical) {
    categoryAccuracy = 0;
    issues.push("No vertical assigned");
  } else if (!isValidVertical(listing.vertical)) {
    categoryAccuracy = 0;
    issues.push(`Invalid vertical: ${listing.vertical}`);
  }
  if (!listing.category) {
    categoryAccuracy -= 30;
    issues.push("No category specified");
  }

  const totalScore = Math.round(
    completeness * 0.25 +
    titleQuality * 0.15 +
    descriptionQuality * 0.15 +
    mediaQuality * 0.20 +
    pricingQuality * 0.10 +
    categoryAccuracy * 0.15
  );

  const readyToPublish = totalScore >= PUBLISH_THRESHOLD && completeness >= 60;
  trackListingAssessmentInternal(!readyToPublish);

  return {
    listingId: listing.id,
    scores: { completeness, titleQuality, descriptionQuality, mediaQuality, pricingQuality, categoryAccuracy },
    totalScore,
    readyToPublish,
    issues,
    assessedAt: now,
  };
}

export function assessListingBatch(listings: Parameters<typeof assessListing>[0][]): ListingQualityReport {
  const scores = listings.map(l => assessListing(l));

  const publishReady = scores.filter(s => s.readyToPublish).length;
  const blocked = scores.filter(s => s.totalScore < 30).length;
  const needsWork = scores.length - publishReady - blocked;
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length)
    : 0;

  const issueCounts = new Map<string, number>();
  for (const s of scores) {
    for (const issue of s.issues) {
      issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
    }
  }
  const topIssues = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => `${issue} (${count})`);

  if (blocked > 0) {
    reportAnomaly("architecture_violation", "listing-quality",
      `${blocked} listings below quality threshold — blocked from publishing`, "high");
  }

  reportHealth(
    "listing-quality",
    blocked > listings.length * 0.3 ? "degraded" : "ok",
    undefined,
    blocked > 0 ? `${blocked} blocked, ${needsWork} need work` : undefined
  );

  return {
    totalListings: listings.length,
    publishReady,
    needsWork,
    blocked,
    averageScore: avgScore,
    topIssues,
    assessedAt: new Date().toISOString(),
  };
}

export function trackListingAssessment(blocked: boolean) {
  trackListingAssessmentInternal(blocked);
}

export function getListingQualityMetrics() {
  return { totalAssessed, totalBlocked };
}

export function runListingQualityEngine(): { status: string; totalAssessed: number; totalBlocked: number } {
  const status = totalBlocked > 0 ? "degraded" : "active";
  reportHealth(
    "listing-quality",
    totalBlocked > 0 ? "degraded" : "ok",
    undefined,
    totalAssessed > 0 ? `${totalAssessed} assessed — ${totalBlocked} blocked` : undefined
  );
  structuredLogger.info("listing", "assessListingQuality", `Listing quality engine active — ${totalAssessed} assessed, ${totalBlocked} blocked`);
  return { status, totalAssessed, totalBlocked };
}
