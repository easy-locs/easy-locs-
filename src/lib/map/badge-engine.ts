/**
 * Badge Engine — Determines which visual badges to show on map markers/cards.
 * Light, performant, no heavy dependencies.
 */
import type { RadarPoint } from "@/lib/radar/types";
import { getCanonicalSubcategory } from "@/lib/taxonomy/world-class-taxonomy";

export type BadgeType =
  | "sponsored"
  | "trending"
  | "verified"
  | "new"
  | "story"
  | "open_now";

export interface EntityBadge {
  type: BadgeType;
  label: string;
  emoji: string;
}

/**
 * Compute badges for a radar point.
 * Max 2 badges to avoid visual clutter.
 */
export function getBadgesForPoint(
  point: RadarPoint,
  opts?: { hasStory?: boolean; isVerified?: boolean; isOpenNow?: boolean }
): EntityBadge[] {
  const badges: EntityBadge[] = [];

  if (point.isSponsored) {
    badges.push({ type: "sponsored", label: "Promoted", emoji: "⭐" });
  }

  if ((point.reviewsCount ?? 0) > 50 && (point.rating ?? 0) >= 4.3) {
    badges.push({ type: "trending", label: "Trending", emoji: "🔥" });
  }

  if (opts?.isVerified) {
    badges.push({ type: "verified", label: "Verified", emoji: "✓" });
  }

  if (opts?.hasStory) {
    badges.push({ type: "story", label: "Story", emoji: "📖" });
  }

  if (opts?.isOpenNow) {
    badges.push({ type: "open_now", label: "Open", emoji: "🟢" });
  }

  // Cap at 2 to keep UI clean
  return badges.slice(0, 2);
}

/**
 * Get the category emoji for a subcategory (for map pin icons).
 */
export function getCategoryIcon(subcategory?: string | null): string {
  if (!subcategory) return "📍";
  const info = getCanonicalSubcategory(subcategory);
  return info?.emoji ?? "📍";
}
