/**
 * provider-quality-engine — Continuous provider quality assessment and trust scoring.
 * Scores providers on completeness, media validity, taxonomy correctness, responsiveness.
 * Low-trust providers get reduced visibility.
 */

import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";
import { isValidVertical } from "./taxonomy-guard";

export interface ProviderTrustScore {
  providerId: string;
  providerName: string;
  scores: {
    completeness: number;
    mediaValidity: number;
    taxonomyCorrectness: number;
    dataQuality: number;
    trustLevel: number;
  };
  totalScore: number;
  tier: "verified" | "standard" | "limited" | "blocked";
  issues: string[];
  lastAssessedAt: string;
}

export interface ProviderQualityReport {
  totalProviders: number;
  verified: number;
  standard: number;
  limited: number;
  blocked: number;
  averageScore: number;
  topIssues: string[];
  assessedAt: string;
}

const trustScores = new Map<string, ProviderTrustScore>();

function scoreTier(score: number): ProviderTrustScore["tier"] {
  if (score >= 80) return "verified";
  if (score >= 55) return "standard";
  if (score >= 30) return "limited";
  return "blocked";
}

export function assessProvider(provider: {
  id: string;
  name: string;
  vertical?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
  logo?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  menuItems?: unknown[];
  listings?: unknown[];
  verified?: boolean;
}): ProviderTrustScore {
  const issues: string[] = [];
  const now = new Date().toISOString();

  let completeness = 0;
  const fields = ["phone", "email", "address", "description", "logo"] as const;
  let filledFields = 0;
  for (const field of fields) {
    if (provider[field]) filledFields++;
    else issues.push(`Missing ${field}`);
  }
  completeness = Math.round((filledFields / fields.length) * 100);

  let mediaValidity = 100;
  if (!provider.logo) {
    mediaValidity -= 40;
    issues.push("No logo uploaded");
  }
  if (!provider.images || provider.images.length === 0) {
    mediaValidity -= 30;
    issues.push("No media images");
  } else if (provider.images.length < 3) {
    mediaValidity -= 15;
    issues.push("Less than 3 media images");
  }

  const imageSet = new Set(provider.images || []);
  if (provider.images && imageSet.size < provider.images.length) {
    mediaValidity -= 20;
    issues.push("Duplicate images detected");
  }

  let taxonomyCorrectness = 100;
  if (!provider.vertical) {
    taxonomyCorrectness = 0;
    issues.push("No vertical assigned");
  } else if (!isValidVertical(provider.vertical)) {
    taxonomyCorrectness = 0;
    issues.push(`Invalid vertical: ${provider.vertical}`);
  }

  let dataQuality = 50;
  if (provider.rating && provider.rating >= 4) dataQuality += 20;
  if (provider.reviewCount && provider.reviewCount >= 10) dataQuality += 15;
  if (provider.description && provider.description.length > 50) dataQuality += 10;
  if (provider.verified) dataQuality += 5;
  dataQuality = Math.min(100, dataQuality);

  let trustLevel = 50;
  if (provider.verified) trustLevel += 30;
  if (provider.rating && provider.rating >= 4.5) trustLevel += 10;
  if (provider.reviewCount && provider.reviewCount >= 20) trustLevel += 10;
  trustLevel = Math.min(100, trustLevel);

  const totalScore = Math.round(
    completeness * 0.25 +
    mediaValidity * 0.20 +
    taxonomyCorrectness * 0.20 +
    dataQuality * 0.15 +
    trustLevel * 0.20
  );

  const tier = scoreTier(totalScore);

  const result: ProviderTrustScore = {
    providerId: provider.id,
    providerName: provider.name,
    scores: { completeness, mediaValidity, taxonomyCorrectness, dataQuality, trustLevel },
    totalScore,
    tier,
    issues,
    lastAssessedAt: now,
  };

  trustScores.set(provider.id, result);

  if (tier === "blocked") {
    reportAnomaly("architecture_violation", "provider-quality",
      `Provider "${provider.name}" blocked — score ${totalScore}/100: ${issues.slice(0, 3).join("; ")}`,
      "high", { providerId: provider.id, totalScore, tier });
  }

  return result;
}

export function assessProviderBatch(providers: Parameters<typeof assessProvider>[0][]): ProviderQualityReport {
  const scores: ProviderTrustScore[] = [];
  for (const p of providers) {
    scores.push(assessProvider(p));
  }

  const verified = scores.filter(s => s.tier === "verified").length;
  const standard = scores.filter(s => s.tier === "standard").length;
  const limited = scores.filter(s => s.tier === "limited").length;
  const blocked = scores.filter(s => s.tier === "blocked").length;
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

  const report: ProviderQualityReport = {
    totalProviders: providers.length,
    verified,
    standard,
    limited,
    blocked,
    averageScore: avgScore,
    topIssues,
    assessedAt: new Date().toISOString(),
  };

  reportHealth(
    "provider-quality",
    blocked > providers.length * 0.2 ? "degraded" : "ok",
    undefined,
    blocked > 0 ? `${blocked} blocked, ${limited} limited providers` : undefined
  );

  return report;
}

export function getProviderTrustScore(providerId: string): ProviderTrustScore | undefined {
  return trustScores.get(providerId);
}

export function getAllTrustScores(): ProviderTrustScore[] {
  return [...trustScores.values()];
}

export function shouldReduceVisibility(providerId: string): boolean {
  const score = trustScores.get(providerId);
  if (!score) return false;
  return score.tier === "limited" || score.tier === "blocked";
}

export function shouldBlockProvider(providerId: string): boolean {
  const score = trustScores.get(providerId);
  if (!score) return false;
  return score.tier === "blocked";
}

export function runProviderQualityEngine(): { totalScored: number; blocked: number; limited: number } {
  const allScores = getAllTrustScores();
  const blocked = allScores.filter(s => s.tier === "blocked").length;
  const limited = allScores.filter(s => s.tier === "limited").length;

  reportHealth(
    "provider-quality",
    blocked > 0 ? "degraded" : "ok",
    undefined,
    allScores.length > 0 ? `${allScores.length} scored — ${blocked} blocked, ${limited} limited` : undefined
  );

  console.log(`[provider-quality] Provider quality engine active — ${allScores.length} providers scored, ${blocked} blocked, ${limited} limited`);
  return { totalScored: allScores.length, blocked, limited };
}
