/**
 * useGeoEntities — Fetch all geo-enabled entities from DB and normalize them.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adaptStorefront, adaptProperty, adaptServiceProvider, type GeoEntity } from "@/lib/geo/geoEntityAdapter";

export function useGeoEntities(opts?: { types?: GeoEntity["type"][]; enabled?: boolean }) {
  const { types, enabled = true } = opts || {};
  const wantAll = !types?.length;

  // Storefronts (restaurants, shops, grocery)
  const { data: storefronts = [] } = useQuery({
    queryKey: ["geo-storefronts"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, city, vertical, subcategory, description, logo_url, cover_url, latitude, longitude, rating, active")
        .eq("active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(200);
      return (data || []).map((r: any) => {
        const v = (r.vertical || "").toLowerCase();
        const entityType = v.includes("food") || v.includes("restaurant") ? "restaurant" as const
          : v.includes("grocery") ? "grocery" as const : "shop" as const;
        return adaptStorefront(r, entityType);
      }).filter(Boolean) as GeoEntity[];
    },
    staleTime: 120_000,
    enabled: enabled && (wantAll || types!.some(t => ["restaurant", "shop", "grocery"].includes(t))),
  });

  // Properties
  const { data: properties = [] } = useQuery({
    queryKey: ["geo-properties"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("properties")
        .select("id, title, city, address, latitude, longitude, photo_url, property_type")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(100);
      return (data || []).map((r: any) => adaptProperty(r)).filter(Boolean) as GeoEntity[];
    },
    staleTime: 120_000,
    enabled: enabled && (wantAll || types!.includes("property")),
  });

  // Service providers
  const { data: services = [] } = useQuery({
    queryKey: ["geo-services"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("concierge_services")
        .select("id, title, provider_name, category, city, latitude, longitude, photo_url, rating, active")
        .eq("active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(100);
      return (data || []).map((r: any) => adaptServiceProvider(r)).filter(Boolean) as GeoEntity[];
    },
    staleTime: 120_000,
    enabled: enabled && (wantAll || types!.includes("service")),
  });

  // Real estate listings (public_listings with geo)
  const { data: realEstate = [] } = useQuery({
    queryKey: ["geo-real-estate"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("public_listings")
        .select("id, title, city, address, latitude, longitude, photo_urls, listing_type, price_per_night, monthly_price, sale_price, active")
        .eq("active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(200);
      return (data || []).map((r: any): GeoEntity | null => {
        if (!r.latitude || !r.longitude) return null;
        const price = r.sale_price || r.monthly_price || r.price_per_night;
        return {
          id: r.id,
          type: "real_estate",
          subtype: r.listing_type || undefined,
          title: r.title || "Property",
          subtitle: price ? `${price.toLocaleString()}` : r.city || undefined,
          image_url: Array.isArray(r.photo_urls) ? r.photo_urls[0] : null,
          lat: Number(r.latitude),
          lng: Number(r.longitude),
          address: r.address,
          city: r.city,
          source_table: "public_listings",
          source_id: r.id,
          route_path: `/listing/${r.id}`,
        };
      }).filter(Boolean) as GeoEntity[];
    },
    staleTime: 120_000,
    enabled: enabled && (wantAll || types!.includes("real_estate")),
  });

  const allEntities: GeoEntity[] = [...storefronts, ...properties, ...services, ...realEstate];

  return {
    entities: allEntities,
    storefronts,
    properties,
    services,
    realEstate,
    isLoading: false,
  };
}
