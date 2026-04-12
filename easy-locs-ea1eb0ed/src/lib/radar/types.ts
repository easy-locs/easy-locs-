export type RadarCategory =
  | "all"
  | "food"
  | "shops"
  | "grocery"
  | "property"
  | "services"
  | "stay"
  | "healthcare"
  | "mobility"
  | "nightlife"
  | "experiences";

export type RadarSubCategory =
  | "pizza"
  | "burger"
  | "sushi"
  | "market"
  | "pharmacy"
  | "apartment"
  | "repair"
  | "cleaning"
  | string;

export type RadarPoint = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  category: RadarCategory;
  subcategory?: RadarSubCategory | null;
  vertical?: string | null;
  lat: number;
  lng: number;
  rating?: number | null;
  reviewsCount?: number | null;
  isSponsored?: boolean;
  distanceKm?: number;
  /** Time-based relevance score (0 = neutral, 1 = boosted) */
  timeScore?: number;
  /** Storefront slug for navigation (storefront_pages only) */
  slug?: string | null;
  /** District / neighborhood for display and ranking */
  district?: string | null;
  /** City name for display */
  cityName?: string | null;
};

export type UserGeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number | null;
};
