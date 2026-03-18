/**
 * Easy-Locs Icon Mapping Foundation
 * Centralized visual identity system — swap icons later without changing business logic.
 */
import {
  iconShop, iconService, iconDriver, iconMobileSeller,
  iconPayment, iconQR, iconLive, iconPin,
  ENTITY_ICON_MAP, PRESENCE_ICON_MAP,
} from "@/lib/map/easy-locs-icons";

export type EasyLocsIconKey =
  | "shop" | "service" | "sale" | "driver"
  | "pay" | "qr" | "pin" | "live"
  | "mobile_seller" | "mobile_service";

export interface IconEntry {
  key: EasyLocsIconKey;
  label: string;
  emoji: string;
  /** Returns SVG string for map/canvas use */
  svg: (size?: number) => string;
  /** Tailwind color class for UI badges */
  colorClass: string;
  /** Hex color for map/canvas */
  hex: string;
}

/**
 * Master icon registry.
 * Later: replace `emoji` and `svg` with custom Easy-Locs assets.
 */
export const ICON_REGISTRY: Record<EasyLocsIconKey, IconEntry> = {
  shop: {
    key: "shop",
    label: "Shop",
    emoji: "🏪",
    svg: iconShop,
    colorClass: "text-amber-500",
    hex: "#D4A853",
  },
  service: {
    key: "service",
    label: "Service",
    emoji: "🔧",
    svg: iconService,
    colorClass: "text-violet-400",
    hex: "#a78bfa",
  },
  sale: {
    key: "sale",
    label: "Sale",
    emoji: "💰",
    svg: iconPin,
    colorClass: "text-amber-500",
    hex: "#D4A853",
  },
  driver: {
    key: "driver",
    label: "Driver",
    emoji: "🚗",
    svg: iconDriver,
    colorClass: "text-emerald-400",
    hex: "#34d399",
  },
  pay: {
    key: "pay",
    label: "Payment",
    emoji: "💳",
    svg: iconPayment,
    colorClass: "text-amber-500",
    hex: "#D4A853",
  },
  qr: {
    key: "qr",
    label: "QR Code",
    emoji: "📱",
    svg: iconQR,
    colorClass: "text-amber-500",
    hex: "#D4A853",
  },
  pin: {
    key: "pin",
    label: "Pin",
    emoji: "📌",
    svg: iconPin,
    colorClass: "text-amber-500",
    hex: "#D4A853",
  },
  live: {
    key: "live",
    label: "Live",
    emoji: "📡",
    svg: iconLive,
    colorClass: "text-cyan-400",
    hex: "#22d3ee",
  },
  mobile_seller: {
    key: "mobile_seller",
    label: "Mobile Seller",
    emoji: "🛒",
    svg: iconMobileSeller,
    colorClass: "text-amber-400",
    hex: "#fbbf24",
  },
  mobile_service: {
    key: "mobile_service",
    label: "Mobile Service",
    emoji: "🔧",
    svg: iconService,
    colorClass: "text-violet-400",
    hex: "#a78bfa",
  },
};

/** Get icon entry by entity_type */
export function getEntityIcon(entityType: string): IconEntry {
  const map: Record<string, EasyLocsIconKey> = {
    fixed_store: "shop",
    mobile_seller: "mobile_seller",
    mobile_service: "mobile_service",
    driver: "driver",
  };
  return ICON_REGISTRY[map[entityType] || "shop"];
}

/** Get icon entry by listing_type */
export function getListingTypeIcon(listingType: string): IconEntry {
  const map: Record<string, EasyLocsIconKey> = {
    sale: "sale",
    service: "service",
    shop: "shop",
  };
  return ICON_REGISTRY[map[listingType] || "sale"];
}

/** Re-export map-level lookups */
export { ENTITY_ICON_MAP, PRESENCE_ICON_MAP };
