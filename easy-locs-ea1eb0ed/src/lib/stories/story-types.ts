export type StoryType = "product" | "merchant" | "property" | "stay" | "deal" | "utility" | "mobility" | "service" | "grocery" | "shops";
export type StoryEntityType = "product" | "merchant" | "property" | "stay" | "atm" | "fuel" | "driver" | "service" | "provider" | "fleet" | "vehicle" | "parking" | "pharmacy" | "hospital";
export type StoryCTAType = "open" | "orbit" | "wallet" | "map" | "save" | "share";
export type StoryMediaType = "image" | "video";

export type StoryConversionType =
  | "orbit_opened"
  | "wallet_paid"
  | "details_opened"
  | "saved"
  | "map_opened"
  | "route_started"
  | "order_started"
  | "booking_started"
  | "viewing_requested";

export interface Story {
  id: string;
  storyType: StoryType;
  entityType: StoryEntityType;
  entityId: string;

  vertical: string;
  categoryKey: string;
  subcategoryKey: string;

  mediaType: StoryMediaType;
  mediaUrl: string;
  mediaPosterUrl?: string;

  title: string;
  subtitle?: string;
  descriptionShort?: string;

  priceLabel?: string;
  statusLabel?: string;
  locationLabel?: string;
  distanceLabel?: string;

  primaryCTAType?: StoryCTAType;
  primaryCTALabel?: string;
  secondaryCTAType?: StoryCTAType;
  secondaryCTALabel?: string;

  expiresAt?: string;
  isActive: boolean;
  languageCode: string;

  rankingSignals: Record<string, number>;
  metadata: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

export interface StoryFeed {
  id: string;
  feedKey: string;
  feedType: string;
  domainKey: string;
  title: string;
  description?: string;
  isActive: boolean;
}

export type StoryFeedKey =
  | "dashboard_for_you"
  | "dashboard_trending"
  | "radar_nearby"
  | "property_buy"
  | "property_rent"
  | "property_projects"
  | "stay_trending"
  | "stay_hotel"
  | "stay_resort"
  | "food_nearby"
  | "food_pizza"
  | "food_lebanese"
  | "food_burger"
  | "grocery_nearby"
  | "grocery_fruits"
  | "grocery_frozen"
  | "grocery_snacks"
  | "utility_atm"
  | "utility_fuel"
  | "utility_pharmacy"
  | "utility_parking"
  | "mobility_nearby"
  | "mobility_taxi"
  | "shops_fashion"
  | "shops_electronics"
  | "shops_home"
  | "shops_trending"
  | "services_nearby"
  | "services_repair"
  | "services_beauty";
