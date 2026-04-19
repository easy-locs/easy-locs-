/**
 * Map type definitions shared across property map stores and layer controls.
 */

/** A single pin rendered on the map canvas. */
export interface MapMarkerRecord {
  id: string;
  type: "listing" | "driver" | "order" | "warehouse" | "pickup" | "dropoff" | "service";
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  /** ID of the listing this marker represents, if type === "listing". */
  listingId?: string;
  /** Orbit profile ID of the listing owner. */
  orbitId?: string;
  selected: boolean;
}

/** Feature-flag object controlling which overlay layers are visible on the map. */
export interface UnifiedMapLayerFlags {
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
  /** Street / POI labels — off by default for visual clarity. */
  labels: boolean;
  heatmap: boolean;
  routes: boolean;
  zones: boolean;
  radius: boolean;
  selectedHighlight: boolean;
  weather: boolean;
  rainRadar: boolean;
  traffic: boolean;
}
