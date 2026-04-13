/**
 * canonical-shop.schema — Canonical shop type for the onboarding pipeline.
 * Single responsibility: type definition for normalized shop data.
 */

export interface ProductOption {
  name: string;
  values: string[];
  priceModifier?: number;
}

export interface CanonicalProduct {
  name: string;
  price: number;
  options?: ProductOption[];
  category?: string;
}

export interface CanonicalShop {
  id: string;
  name: string;
  location: {
    address: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
  categories: string[];
  products: CanonicalProduct[];
  media: {
    logo?: string;
    cover?: string;
    gallery: string[];
  };
  hours: {
    day: string;
    open: string;
    close: string;
  }[];
  delivery: {
    radius?: number;
    fee?: number;
  };
  source: {
    provider: string;
    url?: string;
    confidence: number;
  };
  quality: {
    score: number;
    missingFields: string[];
  };
}
