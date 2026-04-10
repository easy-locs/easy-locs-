import type { MediaDomain, FallbackImage } from "./types";
import { getDomainForVertical } from "./media-families";

const DOMAIN_FALLBACKS: Record<MediaDomain, FallbackImage> = {
  food: {
    url: "/assets/fallbacks/food-default.webp",
    domain: "food",
    label: "Generic food image",
  },
  grocery: {
    url: "/assets/fallbacks/grocery-default.webp",
    domain: "grocery",
    label: "Generic grocery product",
  },
  property: {
    url: "/assets/fallbacks/property-default.webp",
    domain: "property",
    label: "Generic property image",
  },
  stay: {
    url: "/assets/fallbacks/stay-default.webp",
    domain: "stay",
    label: "Generic hotel/stay image",
  },
  utility: {
    url: "/assets/fallbacks/utility-default.webp",
    domain: "utility",
    label: "Generic utility point",
  },
  service: {
    url: "/assets/fallbacks/service-default.webp",
    domain: "service",
    label: "Generic service provider",
  },
  mobility: {
    url: "/assets/fallbacks/mobility-default.webp",
    domain: "mobility",
    label: "Generic vehicle/mobility",
  },
  shops: {
    url: "/assets/fallbacks/shops-default.webp",
    domain: "shops",
    label: "Generic shop/retail",
  },
  beauty: {
    url: "/assets/fallbacks/beauty-default.webp",
    domain: "beauty",
    label: "Generic beauty/salon",
  },
  experiences: {
    url: "/assets/fallbacks/experiences-default.webp",
    domain: "experiences",
    label: "Generic experience",
  },
};

export function getDomainFallback(vertical: string): FallbackImage {
  const domain = getDomainForVertical(vertical);
  return DOMAIN_FALLBACKS[domain] ?? DOMAIN_FALLBACKS.food;
}

export function getFallbackForDomain(domain: MediaDomain): FallbackImage {
  return DOMAIN_FALLBACKS[domain] ?? DOMAIN_FALLBACKS.food;
}

export function isFallbackSafe(fallbackDomain: MediaDomain, entityDomain: MediaDomain): boolean {
  return fallbackDomain === entityDomain;
}

export function isImageDomainSafe(imageUrl: string, entityDomain: MediaDomain): boolean {
  const url = imageUrl.toLowerCase();
  const domainHints: Record<MediaDomain, string[]> = {
    food: ["food", "restaurant", "meal", "dish", "pizza", "burger", "cafe", "kitchen", "cuisine"],
    grocery: ["grocery", "product", "store", "supermarket", "market", "fruit", "vegetable"],
    property: ["property", "apartment", "villa", "house", "building", "real-estate", "realestate", "listing"],
    stay: ["hotel", "resort", "room", "suite", "accommodation", "hostel", "lodge", "booking"],
    utility: ["atm", "fuel", "gas", "pharmacy", "parking", "bank", "station"],
    service: ["service", "repair", "plumber", "electric", "cleaning", "handyman", "technician"],
    mobility: ["taxi", "car", "vehicle", "driver", "ride", "transport", "delivery"],
    shops: ["shop", "fashion", "electronics", "retail", "boutique", "store"],
    beauty: ["salon", "beauty", "spa", "hair", "nail", "cosmetic"],
    experiences: ["experience", "tour", "activity", "event", "travel", "flight"],
  };

  for (const [domain, hints] of Object.entries(domainHints)) {
    if (domain === entityDomain) continue;
    for (const hint of hints) {
      if (url.includes(hint)) {
        const entityHints = domainHints[entityDomain] ?? [];
        const matchesEntity = entityHints.some((h) => url.includes(h));
        if (!matchesEntity) return false;
      }
    }
  }

  return true;
}

export function resolveSafeImage(
  imageUrl: string | undefined | null,
  vertical: string,
): { url: string; isFallback: boolean; domain: MediaDomain } {
  const domain = getDomainForVertical(vertical);

  if (imageUrl && imageUrl.trim() !== "") {
    return { url: imageUrl, isFallback: false, domain };
  }

  const fallback = DOMAIN_FALLBACKS[domain] ?? DOMAIN_FALLBACKS.food;
  return { url: fallback.url, isFallback: true, domain };
}

export function resolveEntityImage(
  images: string[],
  vertical: string,
): { url: string; isFallback: boolean; index: number } {
  const domain = getDomainForVertical(vertical);

  for (let i = 0; i < images.length; i++) {
    if (images[i] && images[i].trim() !== "") {
      return { url: images[i], isFallback: false, index: i };
    }
  }

  const fallback = DOMAIN_FALLBACKS[domain] ?? DOMAIN_FALLBACKS.food;
  return { url: fallback.url, isFallback: true, index: -1 };
}

export function getAllFallbacks(): FallbackImage[] {
  return Object.values(DOMAIN_FALLBACKS);
}
