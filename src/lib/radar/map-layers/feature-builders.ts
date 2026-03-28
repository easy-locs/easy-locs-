/**
 * Map God Engine — GeoJSON feature builders.
 */
import type { ShopPoint, UserPoint, DriverPoint, OrderRoute } from "./types";

export function buildShopFeatures(shops: ShopPoint[] = []): GeoJSON.Feature[] {
  return shops.map((shop) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [shop.lng, shop.lat] },
    properties: { id: shop.id, name: shop.name, category: shop.category ?? "shop" },
  }));
}

export function buildUserFeatures(users: UserPoint[] = []): GeoJSON.Feature[] {
  return users.map((u) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [u.lng, u.lat] },
    properties: { id: u.id },
  }));
}

export function buildDriverFeatures(drivers: DriverPoint[] = []): GeoJSON.Feature[] {
  return drivers.map((d) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
    properties: {
      id: d.id,
      heading: d.heading ?? 0,
      speed: d.speed ?? 0,
      status: d.status ?? "idle",
    },
  }));
}

export function buildRouteFeature(route: OrderRoute): GeoJSON.Feature {
  return {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: route.coordinates },
    properties: { id: route.id, status: route.status ?? "pending" },
  };
}
