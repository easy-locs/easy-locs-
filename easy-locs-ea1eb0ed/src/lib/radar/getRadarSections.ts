/**
 * getRadarSections — Fetches personalized radar sections using existing engines.
 * Returns For You, Best Now, Trending Nearby data for UI injection.
 */
import { buildUserContext } from "@/lib/engines/personal-radar/context-awareness-engine";
import { personalizeEntities, type PersonalizedEntity } from "@/lib/engines/personal-radar/hyper-personalization-engine";
import { loadRadarProfile, type UserRadarProfile } from "@/lib/engines/personal-radar/personal-profile-engine";

interface RadarEntity {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
  imageUrl?: string;
  image_url?: string;
}

export interface RadarSections {
  forYou: PersonalizedEntity[];
  bestNow: PersonalizedEntity[];
  trending: PersonalizedEntity[];
}

/**
 * Compute personalized radar sections from existing engines.
 * < 200ms target — all computation is client-side.
 */
export async function getRadarSections(
  userId: string | null,
  entities: RadarEntity[],
): Promise<RadarSections> {
  // Load profile (null for anon)
  let profile: UserRadarProfile | null = null;
  if (userId) {
    try {
      profile = await loadRadarProfile(userId);
    } catch {}
  }

  const context = buildUserContext({
    nearbyCategories: entities.map(e => e.category || "service"),
  });

  const scored = personalizeEntities(
    entities.map(e => ({
      ...e,
      distanceKm: e.distance ?? 99,
      imageUrl: e.imageUrl || e.image_url,
    })),
    profile,
    context,
  );

  // For You: top 10 by personal taste score
  const forYou = scored.slice(0, 10);

  // Best Now: filter by time relevance (already scored via personalizeEntities)
  // Take items with "Perfect timing" match reason
  const bestNow = scored
    .filter(e => e.matchReasons.includes("Perfect timing") || e.matchReasons.includes("Very close"))
    .slice(0, 10);

  // Trending Nearby: high rating + close distance
  const trending = [...scored]
    .filter(e => (e.rating ?? 0) >= 4.0 && e.distanceKm < 3)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10);

  return { forYou, bestNow, trending };
}
