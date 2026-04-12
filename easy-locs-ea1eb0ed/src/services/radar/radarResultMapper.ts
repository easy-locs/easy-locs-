import type { RadarPoint } from "@/lib/radar/types";
import type { RadarResultItem, RadarVertical } from "@/lib/radar/radar-result-item";
import {
  formatDistanceLabel, formatRatingLabel, buildRoute,
  buildPrimaryAction, buildSecondaryActions,
} from "@/lib/radar/radar-result-item";
import { computeRadarScore, type RadarScoringContext, type RadarScorableEntity } from "@/lib/radar/radar-score";

const CATEGORY_TO_VERTICAL: Record<string, RadarVertical> = {
  food: "food", restaurant: "food", cafe: "food", bakery: "food",
  fast_food: "food", coffee: "food", pizza: "food", sushi: "food",
  hotel: "hotel", resort: "hotel", hostel: "hotel",
  stay: "stay", accommodation: "stay",
  property: "property", real_estate: "property", apartment: "property",
  villa: "property", townhouse: "property",
  services: "services", repair: "services", cleaning: "services",
  beauty: "services", spa: "services", salon: "services",
  shops: "shops", shop: "shops", retail: "shops", fashion: "shops",
  electronics: "shops", supermarket: "grocery",
  grocery: "grocery", market: "grocery", pharmacy: "grocery",
  taxi: "taxi", ride: "taxi", driver: "taxi", courier: "taxi",
  mobility: "mobility", transport: "mobility", car_rental: "mobility",
  healthcare: "healthcare", clinic: "healthcare", hospital: "healthcare",
  dentist: "healthcare", doctor: "healthcare",
  nightlife: "nightlife", bar: "nightlife", club: "nightlife", lounge: "nightlife",
  experiences: "experiences", activities: "experiences", travel: "experiences",
  utility: "utility", atm: "utility", fuel: "utility", parking: "utility",
};

function inferVertical(point: RadarPoint): RadarVertical {
  const cat = (point.subcategory || point.category || "").toLowerCase();
  for (const [key, vertical] of Object.entries(CATEGORY_TO_VERTICAL)) {
    if (cat.includes(key)) return vertical;
  }
  return "shops";
}

function pointToScorable(point: RadarPoint): RadarScorableEntity {
  return {
    id: point.id,
    entityType: "business",
    vertical: point.category,
    subcategory: point.subcategory ?? undefined,
    rating: point.rating,
    reviewCount: point.reviewsCount,
    lat: point.lat,
    lng: point.lng,
    isSponsored: point.isSponsored,
    title: point.title,
    timeScore: point.timeScore,
    districtCode: point.district ?? undefined,
    profileScore: computeProfileScore(point),
    hasImage: !!point.imageUrl,
    hasAddress: !!(point.subtitle || point.district),
    hasCategoryMatch: !!(point.category || point.subcategory),
    hasDescription: !!point.subtitle,
  };
}

function computeProfileScore(point: RadarPoint): number {
  let score = 0;
  if (point.title) score += 0.2;
  if (point.imageUrl) score += 0.2;
  if (point.rating && point.rating > 0) score += 0.15;
  if (point.reviewsCount && point.reviewsCount > 0) score += 0.1;
  if (point.subtitle || point.district) score += 0.15;
  if (point.category) score += 0.1;
  if (point.subcategory) score += 0.1;
  return Math.min(1, score);
}

export function mapPointToResultItem(
  point: RadarPoint,
  ctx: RadarScoringContext = {}
): RadarResultItem {
  const vertical = inferVertical(point);
  const scorable = pointToScorable(point);
  const scoreCtx: RadarScoringContext = { ...ctx, vertical };
  const breakdown = computeRadarScore(scorable, scoreCtx);

  return {
    id: point.id,
    type: vertical,
    vertical: String(vertical),
    title: point.title,
    subtitle: point.subtitle ?? null,
    priceLabel: null,
    distanceLabel: formatDistanceLabel(point.distanceKm),
    distanceKm: point.distanceKm ?? null,
    ratingValue: point.rating ?? null,
    ratingLabel: formatRatingLabel(point.rating, point.reviewsCount ?? undefined),
    reviewsCount: point.reviewsCount ?? 0,
    statusLabel: null,
    available: true,
    image: point.imageUrl ?? null,
    lat: point.lat,
    lng: point.lng,
    route: buildRoute({ slug: point.slug, id: point.id }),
    slug: point.slug ?? null,
    category: point.category,
    subcategory: point.subcategory ?? null,
    district: point.district ?? null,
    city: point.cityName ?? null,
    address: point.subtitle ?? null,
    isSponsored: point.isSponsored ?? false,
    qualityScore: computeProfileScore(point),
    radarScore: breakdown.total,
    primaryAction: buildPrimaryAction(vertical),
    secondaryActions: buildSecondaryActions(vertical, { orbitBindable: true, walletBindable: true }),
    orbitBindable: true,
    walletBindable: true,
    meta: {},
  };
}

export function mapPointsToResultItems(
  points: RadarPoint[],
  ctx: RadarScoringContext = {}
): RadarResultItem[] {
  return points.map(p => mapPointToResultItem(p, ctx));
}
