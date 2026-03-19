/**
 * DINO V6 — Pro Performance Engine
 * Scores professionals, suggests improvements, triggers reminders.
 */

export interface ProProfile {
  id: string;
  name: string;
  type: "restaurant" | "property" | "service" | "shop";
  responseRate: number;       // 0-1
  completionRate: number;     // 0-1
  conversionRate: number;     // 0-1
  profileQuality: number;     // 0-100
  mediaQuality: number;       // 0-100
  reviewCount: number;
  rating: number;             // 0-5
  lastActiveAt?: string;
  photoCount: number;
  categoryCount: number;
  hasDescription: boolean;
  hasLogo: boolean;
  hasCover: boolean;
}

export interface ProPerformanceResult {
  id: string;
  overallScore: number;        // 0-100
  tier: "excellent" | "good" | "needs_improvement" | "at_risk";
  improvements: ProImprovement[];
  visibilityPenalty: boolean;
}

export interface ProImprovement {
  area: string;
  current: string;
  target: string;
  impact: "high" | "medium" | "low";
  action: string;
}

export function evaluateProPerformance(pro: ProProfile): ProPerformanceResult {
  const scores = {
    response: pro.responseRate * 20,
    completion: pro.completionRate * 15,
    conversion: pro.conversionRate * 15,
    profile: pro.profileQuality * 0.15,
    media: pro.mediaQuality * 0.15,
    reviews: Math.min(10, (pro.reviewCount / 20) * 10),
    rating: (pro.rating / 5) * 10,
  };

  const overallScore = Math.round(
    scores.response + scores.completion + scores.conversion +
    scores.profile + scores.media + scores.reviews + scores.rating
  );

  const improvements: ProImprovement[] = [];

  if (pro.photoCount < 3) {
    improvements.push({ area: "Photos", current: `${pro.photoCount} photos`, target: "5+ photos", impact: "high", action: "Upload high-quality photos of your business" });
  }
  if (!pro.hasDescription) {
    improvements.push({ area: "Description", current: "Missing", target: "200+ chars", impact: "high", action: "Add a compelling business description" });
  }
  if (!pro.hasLogo) {
    improvements.push({ area: "Logo", current: "Missing", target: "Logo uploaded", impact: "medium", action: "Upload your business logo" });
  }
  if (!pro.hasCover) {
    improvements.push({ area: "Cover", current: "Missing", target: "Cover uploaded", impact: "medium", action: "Upload a cover photo" });
  }
  if (pro.responseRate < 0.8) {
    improvements.push({ area: "Response Rate", current: `${Math.round(pro.responseRate * 100)}%`, target: "80%+", impact: "high", action: "Respond to inquiries faster" });
  }
  if (pro.categoryCount < 2) {
    improvements.push({ area: "Categories", current: `${pro.categoryCount}`, target: "3+ categories", impact: "low", action: "Add relevant categories to improve discoverability" });
  }

  const tier = overallScore >= 80 ? "excellent" : overallScore >= 60 ? "good" : overallScore >= 40 ? "needs_improvement" : "at_risk";
  const visibilityPenalty = overallScore < 35;

  return { id: pro.id, overallScore, tier, improvements, visibilityPenalty };
}
