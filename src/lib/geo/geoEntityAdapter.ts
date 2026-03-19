/**
 * GeoEntity — Unified geographic entity model for all services.
 * Adapters convert DB records into a common format for map/radar rendering.
 */

export interface GeoEntity {
  id: string;
  type: "restaurant" | "shop" | "property" | "driver" | "courier" | "hotel" | "service" | "grocery";
  subtype?: string;
  title: string;
  subtitle?: string;
  image_url?: string | null;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  area?: string;
  rating?: number;
  status?: "open" | "closed" | "busy" | "available";
  distance_m?: number;
  eta_min?: number;
  source_table: string;
  source_id: string;
  route_path: string;
}

/** Adapt storefront_pages row → GeoEntity */
export function adaptStorefront(row: any, entityType: "restaurant" | "shop" | "grocery" = "restaurant"): GeoEntity | null {
  if (!row.latitude || !row.longitude) return null;
  return {
    id: row.id,
    type: entityType,
    subtype: row.subcategory || row.vertical || undefined,
    title: row.name || "Store",
    subtitle: row.subcategory || row.city || undefined,
    image_url: row.logo_url || row.cover_url || null,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    city: row.city || undefined,
    rating: row.rating ?? undefined,
    status: row.active ? "open" : "closed",
    source_table: "storefront_pages",
    source_id: row.id,
    route_path: entityType === "restaurant"
      ? `/food/restaurant/${row.slug || row.id}`
      : `/store/${row.slug || row.id}`,
  };
}

/** Adapt property/listing → GeoEntity */
export function adaptProperty(row: any): GeoEntity | null {
  const lat = row.latitude ?? row.lat;
  const lng = row.longitude ?? row.lng;
  if (!lat || !lng) return null;
  return {
    id: row.id,
    type: "property",
    subtype: row.property_type || row.listing_type || undefined,
    title: row.title || row.name || "Property",
    subtitle: row.city || row.address || undefined,
    image_url: row.photo_url || row.cover_url || null,
    lat: Number(lat),
    lng: Number(lng),
    address: row.address,
    city: row.city,
    rating: row.rating ?? undefined,
    source_table: "properties",
    source_id: row.id,
    route_path: `/real-estate/property/${row.id}`,
  };
}

/** Adapt live driver → GeoEntity */
export function adaptDriver(row: any): GeoEntity | null {
  if (!row.lat && !row.live_lat) return null;
  return {
    id: row.id,
    type: "driver",
    subtype: row.type || row.entity_type || "taxi",
    title: row.name || row.provider_name || "Driver",
    subtitle: row.vehicle || undefined,
    lat: Number(row.lat ?? row.live_lat),
    lng: Number(row.lng ?? row.live_lng),
    status: (row.status as any) || "available",
    source_table: "drivers",
    source_id: row.id,
    route_path: `/ride`,
  };
}

/** Adapt hotel/travel stay → GeoEntity */
export function adaptHotel(row: any): GeoEntity | null {
  if (!row.latitude || !row.longitude) return null;
  return {
    id: row.id,
    type: "hotel",
    subtype: row.stay_type || undefined,
    title: row.name || row.title || "Hotel",
    subtitle: row.city || undefined,
    image_url: row.photo_url || row.cover_url || null,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    city: row.city,
    rating: row.rating ?? undefined,
    source_table: "hotels",
    source_id: row.id,
    route_path: `/travel/hotel/${row.id}`,
  };
}

/** Adapt service provider → GeoEntity */
export function adaptServiceProvider(row: any): GeoEntity | null {
  if (!row.latitude || !row.longitude) return null;
  return {
    id: row.id,
    type: "service",
    subtype: row.category || row.service_type || undefined,
    title: row.title || row.name || "Service",
    subtitle: row.provider_name || row.city || undefined,
    image_url: row.photo_url || null,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    city: row.city,
    rating: row.rating ?? undefined,
    source_table: "concierge_services",
    source_id: row.id,
    route_path: `/services/${row.id}`,
  };
}
