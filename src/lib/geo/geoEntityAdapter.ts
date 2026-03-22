/**
 * GeoEntity — Unified geographic entity type for maps and radar.
 */
export interface GeoEntity {
  id: string;
  type: "restaurant" | "shop" | "grocery" | "property" | "driver" | "courier" | "hotel" | "service";
  name: string;
  title?: string;
  subtitle?: string;
  city?: string;
  subtype?: string;
  lat: number;
  lng: number;
  rating?: number;
  distance?: number;
  imageUrl?: string;
  image_url?: string;
  slug?: string;
  category?: string;
  address?: string;
  route_path?: string;
}
