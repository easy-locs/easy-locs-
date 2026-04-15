/**
 * quality.media.score — Scores media/photo quality.
 * ONE thing: evaluate photo presence and quality.
 */
import type { QualityDimension } from "../contracts";

export function scoreMedia(params: {
  photoCount: number;
  hasLogo: boolean;
  hasCover: boolean;
  stockPhotoCount: number;
  verifiedImageCount?: number;
}): QualityDimension {
  let score = 0;
  const details: string[] = [];

  if (params.photoCount === 0) { details.push("no photos"); }
  else if (params.photoCount < 3) { score += 30; details.push("few photos"); }
  else if (params.photoCount < 6) { score += 60; }
  else { score += 80; }

  if (params.hasLogo) score += 10;
  else details.push("no logo");

  if (params.hasCover) score += 10;
  else details.push("no cover");

  if (params.stockPhotoCount > 0) {
    score -= params.stockPhotoCount * 10;
    details.push(`${params.stockPhotoCount} stock photos`);
  }

  const verified = params.verifiedImageCount ?? 0;
  if (params.photoCount > 0 && verified === 0) {
    score = Math.round(score * 0.5);
    details.push("no verified images (external URLs only)");
  } else if (params.photoCount > 0 && verified < params.photoCount) {
    const unverifiedCount = params.photoCount - verified;
    const penalty = Math.min(unverifiedCount * 5, 20);
    score -= penalty;
    details.push(`${unverifiedCount} unverified external URL(s)`);
  }

  score = Math.max(0, Math.min(100, score));
  return { dimension: "media", score, weight: 0.15, details: details.join("; ") || "good media" };
}
