import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  scoreRecommendations,
  scoreRecommendationsAsync,
  getRecommendations,
  trackUserInteraction,
  type RecommendationItem,
} from "@/engines/recommendations/recommendation-engine";

interface UseRecommendationsOptions {
  userId?: string;
  favorites?: string[];
  location?: { lat: number; lng: number };
  limit?: number;
  usePgvector?: boolean;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

const routeHistory: string[] = [];
const MAX_HISTORY = 20;

const ITEM_ROUTE_PATTERNS = [
  /\/shop\/([^/]+)/,
  /\/listing\/([^/]+)/,
  /\/product\/([^/]+)/,
  /\/service\/([^/]+)/,
  /\/provider\/([^/]+)/,
  /\/property\/([^/]+)/,
  /\/store\/([^/]+)/,
  /\/restaurant\/([^/]+)/,
];

function extractItemIdFromRoute(pathname: string): string | null {
  for (const pattern of ITEM_ROUTE_PATTERNS) {
    const match = pathname.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Module-level stable empty array. Using the destructure default
// `favorites = []` produced a fresh array reference on every render, which
// then entered `useCallback(refresh, [..., favorites, ...])` as a changed
// dependency. That regenerated `refresh` every render, which made the
// `useEffect(() => refresh(), [refresh])` below re-fire every render,
// which called `setLoading(true)` and re-rendered, looping forever and
// emitting a flood of "Maximum update depth exceeded" warnings. See
// scripts/check-build-invariants.cjs for the regression guard.
const EMPTY_FAVORITES: readonly string[] = Object.freeze([]);

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { userId, limit = 6, usePgvector = true } = options;
  const favorites = options.favorites ?? (EMPTY_FAVORITES as readonly string[]);
  const location = options.location;
  const { pathname } = useLocation();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(() => getRecommendations().slice(0, limit));
  const [loading, setLoading] = useState(false);

  // Primitive-string dep keys keep `refresh` referentially stable even
  // when callers pass fresh inline arrays/objects on each render. React
  // compares deps with Object.is — equal strings short-circuit cleanly,
  // equal arrays/objects do not.
  const favoritesKey = favorites.length === 0 ? "" : favorites.join("|");
  const locationKey = location ? `${location.lat},${location.lng}` : "";

  useEffect(() => {
    if (!routeHistory.includes(pathname)) {
      routeHistory.push(pathname);
      if (routeHistory.length > MAX_HISTORY) routeHistory.splice(0, routeHistory.length - MAX_HISTORY);
    }

    const routeItemId = extractItemIdFromRoute(pathname);
    if (userId && routeItemId) {
      trackUserInteraction(userId, routeItemId, "view");
    }
  }, [pathname, userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ctx = {
        userId,
        recentRoutes: [...routeHistory],
        favorites: favorites as string[],
        location,
        timeOfDay: getTimeOfDay(),
      };

      let scored: RecommendationItem[];
      if (usePgvector && userId) {
        scored = await scoreRecommendationsAsync(ctx);
      } else {
        scored = scoreRecommendations(ctx);
      }
      setRecommendations(scored.slice(0, limit));
    } finally {
      setLoading(false);
    }
     
  }, [userId, favoritesKey, locationKey, limit, usePgvector]);

  const trackInteraction = useCallback(
    (itemId: string, type: "view" | "click" | "purchase" | "favorite" | "review") => {
      if (userId) {
        trackUserInteraction(userId, itemId, type);
      }
    },
    [userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recommendations, loading, refresh, trackInteraction };
}
