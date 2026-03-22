export type RadarCategory =
  | "all"
  | "food"
  | "shops"
  | "grocery"
  | "property"
  | "services";

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
  lat: number;
  lng: number;
  rating?: number | null;
  reviewsCount?: number | null;
  isSponsored?: boolean;
  distanceKm?: number;
};

export type UserGeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number | null;
};
