/**
 * Map God Engine — shared types.
 */
export type LngLat = [number, number];

export type DriverPoint = {
  id: string;
  lng: number;
  lat: number;
  heading?: number;
  speed?: number;
  status?: "idle" | "busy" | "delivering";
};

export type OrderRoute = {
  id: string;
  coordinates: LngLat[];
  status?: "pending" | "accepted" | "picked_up" | "delivered";
};

export type ShopPoint = {
  id: string;
  lng: number;
  lat: number;
  name: string;
  category?: string;
};

export type UserPoint = {
  id: string;
  lng: number;
  lat: number;
};

export type RadarMapGodOptions = {
  shops?: ShopPoint[];
  drivers?: DriverPoint[];
  users?: UserPoint[];
  orderRoutes?: OrderRoute[];
};
