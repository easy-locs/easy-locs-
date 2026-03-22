/**
 * GeoEntity — Unified geographic entity type for maps and radar.
 */
export interface GeoEntity {
  id: string;
  type: "restaurant" | "shop" | "grocery" | "property" | "driver" | "courier" | "hotel" | "service";
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  distance?: number;
  imageUrl?: string;
  slug?: string;
  category?: string;
  address?: string;
}
