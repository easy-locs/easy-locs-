import type { RadarCategory } from "./types";

export type RadarVertical = "food" | "services" | "hotel" | "property" | "taxi" | "shops" | "healthcare" | "nightlife" | "grocery" | "stay" | "mobility" | "experiences" | "utility";

export interface RadarResultItem {
  id: string;
  type: RadarVertical;
  vertical: string;
  title: string;
  subtitle: string | null;
  priceLabel: string | null;
  distanceLabel: string | null;
  distanceKm: number | null;
  ratingValue: number | null;
  ratingLabel: string | null;
  reviewsCount: number;
  statusLabel: string | null;
  available: boolean;
  image: string | null;
  lat: number;
  lng: number;
  route: string;
  slug: string | null;
  category: string;
  subcategory: string | null;
  district: string | null;
  city: string | null;
  address: string | null;
  isSponsored: boolean;
  qualityScore: number;
  radarScore: number;
  primaryAction: RadarAction;
  secondaryActions: RadarAction[];
  orbitBindable: boolean;
  walletBindable: boolean;
  meta: Record<string, unknown>;
}

export interface RadarAction {
  type: "view" | "message" | "navigate" | "book" | "order" | "call" | "pay" | "save" | "share" | "compare";
  label: string;
  icon: string;
  enabled: boolean;
}

export function formatDistanceLabel(km: number | null | undefined): string | null {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`;
}

export function formatRatingLabel(rating: number | null | undefined, count?: number): string | null {
  if (rating == null || rating <= 0) return null;
  const r = rating.toFixed(1);
  return count && count > 0 ? `${r} (${count})` : r;
}

export function buildRoute(item: { slug?: string | null; id: string; type?: string }): string {
  if (item.slug) return `/s/${item.slug}`;
  return `/entity/${item.id}`;
}

export function buildPrimaryAction(type: RadarVertical): RadarAction {
  switch (type) {
    case "food":
    case "nightlife":
      return { type: "order", label: "Order", icon: "ShoppingBag", enabled: true };
    case "hotel":
    case "stay":
      return { type: "book", label: "Book", icon: "Calendar", enabled: true };
    case "property":
      return { type: "view", label: "View", icon: "Eye", enabled: true };
    case "taxi":
    case "mobility":
      return { type: "book", label: "Request", icon: "Car", enabled: true };
    case "services":
      return { type: "book", label: "Book", icon: "Calendar", enabled: true };
    case "healthcare":
      return { type: "book", label: "Appointment", icon: "Calendar", enabled: true };
    case "experiences":
      return { type: "book", label: "Book", icon: "Calendar", enabled: true };
    default:
      return { type: "view", label: "View", icon: "Eye", enabled: true };
  }
}

export function buildSecondaryActions(type: RadarVertical, flags: { orbitBindable: boolean; walletBindable: boolean }): RadarAction[] {
  const actions: RadarAction[] = [
    { type: "message", label: "Message", icon: "MessageCircle", enabled: flags.orbitBindable },
    { type: "navigate", label: "Navigate", icon: "Navigation", enabled: true },
    { type: "save", label: "Save", icon: "Heart", enabled: true },
    { type: "share", label: "Share", icon: "Share2", enabled: true },
  ];
  if (type === "property" || type === "hotel" || type === "stay") {
    actions.push({ type: "compare", label: "Compare", icon: "GitCompare", enabled: true });
  }
  if (flags.walletBindable && (type === "food" || type === "services" || type === "hotel" || type === "stay" || type === "healthcare")) {
    actions.push({ type: "pay", label: "Pay", icon: "Wallet", enabled: true });
  }
  return actions;
}
