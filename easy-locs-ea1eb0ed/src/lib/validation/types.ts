export type MediaFamily =
  | "food_pizza"
  | "food_burger"
  | "food_shawarma"
  | "food_sushi"
  | "food_dessert"
  | "food_beverage"
  | "food_general"
  | "grocery_fruit"
  | "grocery_vegetable"
  | "grocery_snack"
  | "grocery_frozen"
  | "grocery_dairy"
  | "grocery_beverage"
  | "grocery_household"
  | "grocery_general"
  | "property_buy"
  | "property_rent"
  | "property_project"
  | "stay_hotel"
  | "stay_room"
  | "stay_resort"
  | "stay_general"
  | "utility_atm"
  | "utility_fuel"
  | "utility_pharmacy"
  | "utility_parking"
  | "utility_general"
  | "service_provider"
  | "service_vehicle"
  | "service_tools"
  | "service_general"
  | "mobility_vehicle"
  | "mobility_driver"
  | "mobility_general"
  | "shops_fashion"
  | "shops_electronics"
  | "shops_general"
  | "beauty_salon"
  | "beauty_general"
  | "experiences_general"
  | "generic_placeholder";

export type MediaDomain =
  | "food"
  | "grocery"
  | "property"
  | "stay"
  | "utility"
  | "service"
  | "mobility"
  | "shops"
  | "beauty"
  | "experiences";

export interface MediaValidationResult {
  valid: boolean;
  imageUrl: string;
  detectedFamily: MediaFamily | null;
  expectedFamily: MediaFamily;
  mismatch: boolean;
  qualityScore: number;
  issues: MediaIssue[];
  blockReason: string | null;
}

export interface MediaIssue {
  type:
    | "too_small"
    | "too_blurry"
    | "wrong_aspect"
    | "duplicate"
    | "empty_image"
    | "text_only"
    | "watermark"
    | "stock_image"
    | "format_invalid"
    | "family_mismatch"
    | "low_quality";
  severity: "critical" | "warning" | "info";
  detail: string;
}

export interface ImageMetadata {
  url: string;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
  isStock?: boolean;
  role?: "logo" | "cover" | "gallery" | "product" | "listing";
}

export interface EntityQualityInput {
  entityId: string;
  entityType: string;
  vertical: string;
  name?: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  email?: string;
  photos: string[];
  logoUrl?: string;
  openingHours?: string;
  price?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  menuItemCount?: number;
  catalogItemCount?: number;
  serviceItemCount?: number;
  roomTypeCount?: number;
  orbitReady?: boolean;
  walletReady?: boolean;
  mediaFamilies?: MediaFamily[];
  expectedMediaFamily?: MediaFamily;
  verificationStatus?: "verified" | "pending" | "unverified";
}

export interface EntityQualityReport {
  entityId: string;
  score: number;
  tier: "premium" | "good" | "limited" | "hidden";
  dimensions: {
    profileCompleteness: number;
    mediaCompleteness: number;
    mediaQuality: number;
    taxonomyCorrectness: number;
    locationPrecision: number;
    pricingCompleteness: number;
    contactAvailability: number;
    orbitReadiness: number;
    walletReadiness: number;
    reviewScore: number;
  };
  issues: string[];
  publishable: boolean;
  feedEligible: boolean;
  storyEligible: boolean;
}

export interface FallbackImage {
  url: string;
  domain: MediaDomain;
  label: string;
}

export interface StoryValidationResult {
  valid: boolean;
  issues: StoryValidationIssue[];
  blockPublish: boolean;
  blockFeed: boolean;
}

export interface StoryValidationIssue {
  field: string;
  rule: string;
  severity: "critical" | "warning" | "info";
  detail: string;
}

export interface FeedValidationResult {
  entityId: string;
  feedKey: string;
  accepted: boolean;
  rejectReason: string | null;
  checks: {
    entityValid: boolean;
    imageValid: boolean;
    taxonomyValid: boolean;
    intentValid: boolean;
    qualityAboveThreshold: boolean;
  };
}
