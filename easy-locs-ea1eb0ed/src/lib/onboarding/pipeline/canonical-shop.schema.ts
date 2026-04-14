/**
 * canonical-shop.schema — Canonical shop type for the onboarding pipeline.
 * Single responsibility: type definition for normalized shop data.
 * V2: Vertical-specific extensions + rich contact schema.
 */

export interface ProductOption {
  name: string;
  values: string[];
  priceModifier?: number;
}

export interface CanonicalProduct {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  sku?: string;
  options?: ProductOption[];
  variants?: Array<{ label: string; price: number; sku?: string }>;
  category?: string;
}

export interface CanonicalMenuItem {
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  tags?: string[];
}

export interface CanonicalService {
  name: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  staffRequired?: string;
  bookingSlots?: string[];
}

export interface CanonicalHotelRoom {
  type: string;
  description?: string;
  pricePerNight?: number;
  capacity?: number;
  amenities?: string[];
  imageUrls?: string[];
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

export interface CanonicalContactV2 {
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  social: SocialLinks;
}

export interface HotelExtension {
  stars?: number;
  amenities?: string[];
  roomTypes?: CanonicalHotelRoom[];
  checkInTime?: string;
  checkOutTime?: string;
  totalRooms?: number;
  policies?: string[];
}

export interface ServiceExtension {
  services?: CanonicalService[];
  bookingRequired?: boolean;
  staffCount?: number;
  specializations?: string[];
}

export interface ProductCatalogExtension {
  products?: CanonicalProduct[];
  catalogDescription?: string;
  brands?: string[];
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

export interface CanonicalShopV2 {
  id: string;
  name: string;
  vertical: string;
  subcategory?: string;
  description?: string;
  aiDescription?: string;
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  contact: CanonicalContactV2;
  location: {
    address: string;
    buildingName?: string;
    floor?: string;
    city: string;
    district?: string;
    country: string;
    lat: number;
    lng: number;
  };
  categories: string[];
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
  delivery?: {
    radius?: number;
    fee?: number;
  };
  taxonomyConfidence?: number;
  hotelData?: HotelExtension;
  serviceData?: ServiceExtension;
  productData?: ProductCatalogExtension;
  menuItems?: CanonicalMenuItem[];
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
