export type ImportSource =
  | "google_maps"
  | "deliveroo_like"
  | "booking_like"
  | "manual_csv"
  | "internal_seed";

export type MerchantVertical =
  | "food"
  | "hotel"
  | "retail"
  | "services";

export type ImportStatus =
  | "draft"
  | "imported"
  | "duplicate"
  | "claimed"
  | "active"
  | "rejected";

export interface ImportedMerchantRecord {
  sourceType: ImportSource;
  sourceExternalId: string;
  sourceName?: string;

  vertical: MerchantVertical;
  merchantName: string;
  merchantNameAr?: string;

  city: string;
  area?: string;
  countryCode: string;

  phone?: string;
  email?: string;
  website?: string;

  lat?: number;
  lng?: number;

  cuisineType?: string;
  tags?: string[];
  rating?: number;
  reviewCount?: number;

  description?: string;
  descriptionAr?: string;

  coverImageUrl?: string;
  logoImageUrl?: string;

  menuItems?: Array<{
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    category?: string;
    photoUrl?: string;
    price?: number | null;
    currency?: string | null;
  }>;
}

export interface CitySeoPageInput {
  countryCode: string;
  city: string;
  vertical: MerchantVertical;
  locale?: "en" | "ar";
}

export interface DemandCaptureInput {
  storefrontPageId?: string;
  merchantProfileId?: string;
  city?: string;
  countryCode?: string;
  vertical?: MerchantVertical;
  eventType:
    | "page_view"
    | "menu_view"
    | "coming_soon_interest"
    | "claim_click"
    | "activation_click"
    | "waitlist_submit";
  sessionId?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ActivationScoreResult {
  score: number;
  band: "cold" | "warm" | "hot" | "priority";
  reasons: string[];
}
