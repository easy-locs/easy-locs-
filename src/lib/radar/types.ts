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
  | "cleaning";

export type RadarPoint = {
  id: string;
  title: string;
  category: RadarCategory;
  subcategory?: RadarSubCategory | null;
  lat: number;
  lng: number;
  rating?: number | null;
  isSponsored?: boolean;
  distanceKm?: number;
};

export type UserGeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number | null;
};
