/**
 * Smart Map Search — Brand-aware, service-aware, geo-ranked search for the map.
 * Handles: "mcdo" → McDonald's nearby, "plombier" → plumbers nearby, etc.
 */
import { resolveBrand, resolveServiceType, resolveEntityVisual, type BrandEntry, type ServiceVisualToken } from "./brand-taxonomy";

export type MapSearchIntent =
  | { type: "brand"; brand: BrandEntry; query: string }
  | { type: "service"; serviceKey: string; token: ServiceVisualToken; query: string }
  | { type: "general"; query: string };

export interface MapSearchResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: string;
  subcategory: string | null;
  iconType: "brand" | "service" | "category" | "monogram";
  iconEmoji: string;
  primaryColor: string;
  logoUrl: string | null;
  monogram: string;
  distanceM: number | null;
  rating: number | null;
  isOpenNow: boolean | null;
  tags: Record<string, string>;
}

// ── INTENT DETECTION ──
export function detectMapSearchIntent(query: string): MapSearchIntent {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { type: "general", query };

  // Brand first
  const brand = resolveBrand(q);
  if (brand) return { type: "brand", brand, query };

  // Service type
  const svc = resolveServiceType(q);
  if (svc) return { type: "service", serviceKey: svc.key, token: svc.token, query };

  return { type: "general", query };
}

// ── DISTANCE CALC ──
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── FILTER + RANK OSM RESULTS ──
export function filterAndRankResults(
  elements: any[],
  intent: MapSearchIntent,
  origin: { lat: number; lng: number } | null,
): MapSearchResult[] {
  let filtered = elements;

  if (intent.type === "brand") {
    const brandAliases = intent.brand.aliases.map(a => a.toLowerCase());
    filtered = elements.filter(el => {
      const name = (el.tags?.name || el.tags?.brand || "").toLowerCase();
      return brandAliases.some(alias => name.includes(alias));
    });
  } else if (intent.type === "service") {
    const keywords = intent.token.keywords.map(k => k.toLowerCase());
    filtered = elements.filter(el => {
      const amenity = (el.tags?.amenity || "").toLowerCase();
      const shop = (el.tags?.shop || "").toLowerCase();
      const tourism = (el.tags?.tourism || "").toLowerCase();
      const leisure = (el.tags?.leisure || "").toLowerCase();
      const name = (el.tags?.name || "").toLowerCase();
      return keywords.some(kw =>
        amenity.includes(kw) || shop.includes(kw) || tourism.includes(kw) ||
        leisure.includes(kw) || name.includes(kw) ||
        amenity === kw || shop === kw
      );
    });
  } else {
    const q = intent.query.toLowerCase();
    filtered = elements.filter(el => {
      const name = (el.tags?.name || "").toLowerCase();
      const amenity = (el.tags?.amenity || "").toLowerCase();
      const shop = (el.tags?.shop || "").toLowerCase();
      return name.includes(q) || amenity.includes(q) || shop.includes(q);
    });
  }

  // Enrich + sort by distance
  const results: MapSearchResult[] = filtered
    .filter(el => el.lat != null && el.lon != null)
    .map(el => {
      const visual = resolveEntityVisual({
        name: el.tags?.name || el.tags?.brand || "",
        tags: el.tags || {},
      });
      const dist = origin ? haversineM(origin.lat, origin.lng, el.lat, el.lon) : null;
      const rating = el.tags?.["stars"] ? parseFloat(el.tags["stars"]) : null;

      return {
        id: `osm-${el.id}`,
        name: el.tags?.name || el.tags?.brand || visual.displayName,
        displayName: visual.displayName,
        lat: el.lat,
        lng: el.lon,
        category: el.tags?.amenity || el.tags?.shop || el.tags?.tourism || el.tags?.leisure || "other",
        subcategory: el.tags?.cuisine || el.tags?.sport || null,
        iconType: visual.iconType,
        iconEmoji: visual.iconEmoji,
        primaryColor: visual.primaryColor,
        logoUrl: visual.logoUrl,
        monogram: visual.monogram,
        distanceM: dist,
        rating,
        isOpenNow: null, // Could parse opening_hours
        tags: el.tags || {},
      };
    });

  // Sort: distance first, then brand match quality
  results.sort((a, b) => {
    if (a.distanceM != null && b.distanceM != null) return a.distanceM - b.distanceM;
    if (a.distanceM != null) return -1;
    if (b.distanceM != null) return 1;
    return 0;
  });

  return results.slice(0, 50);
}
