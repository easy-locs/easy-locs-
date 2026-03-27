/**
 * Canonical Map Types — Single source of truth for all map entities, layers, routes, and zones.
 */

export type MapEntityKind =
  | "restaurant"
  | "grocery"
  | "hotel"
  | "property"
  | "service"
  | "driver"
  | "order"
  | "pickup"
  | "dropoff"
  | "warehouse"
  | "user";

export type MapEntityStatus =
  | "active"
  | "inactive"
  | "busy"
  | "available"
  | "preparing"
  | "delivering"
  | "pending"
  | "completed"
  | "cancelled"
  | "offline";

export type MapEntity = {
  id: string;
  kind: MapEntityKind;
  title: string;
  subtitle?: string | null;
  lat: number;
  lng: number;
  status?: MapEntityStatus | string | null;
  image?: string | null;
  rating?: number | null;
  price?: number | null;
  currency?: string | null;
  distanceKm?: number | null;
  etaMin?: number | null;
  score?: number | null;
  isOpen?: boolean | null;
  isSponsored?: boolean;
  source?: string | null;
  tags?: string[];
  slug?: string | null;
  raw?: any;
};

export type MapRoutePoint = { lat: number; lng: number };

export type MapRoute = {
  id: string;
  kind: "delivery" | "driver" | "user" | "navigation";
  color?: string | null;
  points: MapRoutePoint[];
  label?: string | null;
};

export type MapZone = {
  id: string;
  title: string;
  kind: "delivery_zone" | "coverage_zone" | "city_zone" | "custom";
  coordinates: [number, number][][];
};

export type UnifiedMapLayerFlags = {
  userLocation: boolean;
  restaurants: boolean;
  grocery: boolean;
  hotels: boolean;
  properties: boolean;
  services: boolean;
  drivers: boolean;
  orders: boolean;
  pickups: boolean;
  dropoffs: boolean;
  warehouses: boolean;
  clusters: boolean;
  labels: boolean;
  heatmap: boolean;
  routes: boolean;
  zones: boolean;
  radius: boolean;
  selectedHighlight: boolean;
  weather: boolean;
  rainRadar: boolean;
  traffic: boolean;
};
