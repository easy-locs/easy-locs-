/**
 * Context Decoration Engine — Smart imagery and decoration based on service/context.
 * Returns recommended visual treatment per page type.
 */

export type ServiceContext = "food" | "property" | "travel" | "ride" | "send" | "grocery" | "services" | "shops" | "settings" | "wallet" | "map" | "radar";

export interface ContextDecoration {
  service: ServiceContext;
  heroStyle: "image-led" | "gradient" | "minimal" | "map-bg";
  emptyStateEmoji: string;
  emptyStateMessage: string;
  cardImageRatio: string;
  cardImageFallback: string; // emoji or icon name
  accentHue?: number; // optional service-specific accent
}

const DECORATIONS: Record<ServiceContext, ContextDecoration> = {
  food: {
    service: "food",
    heroStyle: "image-led",
    emptyStateEmoji: "🍽️",
    emptyStateMessage: "No restaurants found nearby",
    cardImageRatio: "4/3",
    cardImageFallback: "🍕",
  },
  property: {
    service: "property",
    heroStyle: "image-led",
    emptyStateEmoji: "🏠",
    emptyStateMessage: "No properties available",
    cardImageRatio: "16/9",
    cardImageFallback: "🏢",
  },
  travel: {
    service: "travel",
    heroStyle: "image-led",
    emptyStateEmoji: "✈️",
    emptyStateMessage: "No destinations available",
    cardImageRatio: "16/9",
    cardImageFallback: "🌍",
  },
  ride: {
    service: "ride",
    heroStyle: "map-bg",
    emptyStateEmoji: "🚗",
    emptyStateMessage: "No rides available",
    cardImageRatio: "1/1",
    cardImageFallback: "🚕",
  },
  send: {
    service: "send",
    heroStyle: "map-bg",
    emptyStateEmoji: "📦",
    emptyStateMessage: "No couriers nearby",
    cardImageRatio: "1/1",
    cardImageFallback: "🛵",
  },
  grocery: {
    service: "grocery",
    heroStyle: "image-led",
    emptyStateEmoji: "🛒",
    emptyStateMessage: "No grocery stores nearby",
    cardImageRatio: "4/3",
    cardImageFallback: "🥬",
  },
  services: {
    service: "services",
    heroStyle: "gradient",
    emptyStateEmoji: "🔧",
    emptyStateMessage: "No service providers found",
    cardImageRatio: "1/1",
    cardImageFallback: "👷",
  },
  shops: {
    service: "shops",
    heroStyle: "image-led",
    emptyStateEmoji: "🛍️",
    emptyStateMessage: "No shops found nearby",
    cardImageRatio: "4/3",
    cardImageFallback: "🏪",
  },
  settings: {
    service: "settings",
    heroStyle: "minimal",
    emptyStateEmoji: "⚙️",
    emptyStateMessage: "",
    cardImageRatio: "1/1",
    cardImageFallback: "⚙️",
  },
  wallet: {
    service: "wallet",
    heroStyle: "gradient",
    emptyStateEmoji: "💳",
    emptyStateMessage: "No transactions yet",
    cardImageRatio: "16/9",
    cardImageFallback: "💰",
  },
  map: {
    service: "map",
    heroStyle: "map-bg",
    emptyStateEmoji: "🗺️",
    emptyStateMessage: "No results in this area",
    cardImageRatio: "16/9",
    cardImageFallback: "📍",
  },
  radar: {
    service: "radar",
    heroStyle: "map-bg",
    emptyStateEmoji: "📡",
    emptyStateMessage: "Scanning nearby...",
    cardImageRatio: "1/1",
    cardImageFallback: "📡",
  },
};

export function getContextDecoration(service: ServiceContext): ContextDecoration {
  return DECORATIONS[service] || DECORATIONS.shops;
}
