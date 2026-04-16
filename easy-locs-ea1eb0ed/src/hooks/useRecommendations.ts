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

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { userId, favorites = [], location, limit = 6, usePgvector = true } = options;
  const { pathname } = useLocation();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(() => getRecommendations().slice(0, limit));
  const [loading, setLoading] = useState(false);

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
        favorites,
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
  }, [userId, favorites, location, limit, usePgvector]);

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
