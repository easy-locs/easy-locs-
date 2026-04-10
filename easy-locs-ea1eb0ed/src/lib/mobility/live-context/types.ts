/**
 * Live Mobility Context — Domain types.
 */
export interface GeoLiveContext {
  zone_key: string;
  traffic_level: string;
  traffic_speed_factor: number;
  weather_type: string;
  weather_speed_factor: number;
  demand_level: string;
  demand_multiplier: number;
  rider_supply_level: string;
  rider_supply_factor: number;
}

export interface MerchantRuntime {
  merchant_id: string;
  is_open_now: boolean;
  accepting_orders: boolean;
  prep_time_minutes: number;
  queue_load: number;
  avg_handover_delay_minutes: number;
  active_orders_count: number;
  active_delivery_jobs_count: number;
  delivery_capacity_score: number;
}

export interface MerchantDeliveryZone {
  id: string;
  merchant_id: string;
  zone_type: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  polygon_geojson: any;
  min_order_amount: number;
  base_delivery_fee: number;
  fee_per_km: number;
  max_eta_minutes: number;
  is_active: boolean;
}

export interface RiderRuntimeState {
  rider_user_id: string;
  is_online: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  vehicle_type: string | null;
  service_modes: string[] | null;
  acceptance_rate: number | null;
  avg_speed_kmh: number | null;
  active_job_id: string | null;
}

export interface ETAResult {
  merchant_id: string;
  estimated_prep_minutes: number;
  estimated_pickup_minutes: number;
  estimated_travel_minutes: number;
  estimated_total_minutes: number;
  traffic_factor: number;
  weather_factor: number;
  demand_factor: number;
  rider_supply_factor: number;
}

export interface MerchantVisibility {
  merchant_id: string;
  delivers_here: boolean;
  is_open: boolean;
  eta_minutes: number | null;
  delivery_fee: number;
  min_order: number;
  visibility_score: number;
  zone: MerchantDeliveryZone | null;
}
