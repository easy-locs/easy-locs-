/**
 * Unified Mobility Types — single canonical type system for taxi, food, grocery, parcel, errand.
 */

export type MobilityContext =
  | "taxi"
  | "food_delivery"
  | "grocery_delivery"
  | "parcel"
  | "errand";

export type MobilityTrafficLevel = "low" | "moderate" | "heavy";
export type MobilityWeatherType = "clear" | "rain" | "storm" | "heat";

export interface MobilityZoneContext {
  zoneKey?: string | null;
  demand: number;
  supply: number;
  traffic: MobilityTrafficLevel;
  weather: MobilityWeatherType;
  merchantPrepMinutes?: number | null;
  merchantBusyLevel?: number | null;
}

export interface MobilityCoordinates {
  lat: number;
  lng: number;
}

export interface UnifiedMobilityJobInput {
  context: MobilityContext;
  customerUserId?: string | null;

  pickup: MobilityCoordinates;
  dropoff: MobilityCoordinates;

  pickupLabel?: string | null;
  dropoffLabel?: string | null;

  serviceLevel?: string | null;
  currency?: string | null;
  zone?: Partial<MobilityZoneContext> | null;

  merchantId?: string | null;
  merchantReady?: boolean | null;
  orderValue?: number | null;
  seatsRequested?: number | null;
  packageSize?: "small" | "medium" | "large" | null;

  metadata?: Record<string, any>;
}

export interface UnifiedDriverScore {
  rider_user_id: string;
  distance_km: number;
  score_total: number;
  score_distance: number;
  score_acceptance: number;
  score_response: number;
  score_reliability: number;
  score_zone: number;
  score_activity: number;
  score_vehicle_fit: number;
  score_gps_quality: number;
  rank_index: number;
  explanation_json: Record<string, any>;
}

export interface UnifiedPricingResult {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  demandMultiplier: number;
  trafficMultiplier: number;
  weatherMultiplier: number;
  serviceMultiplier: number;
  surgeMultiplier: number;
  merchantPrepFee: number;
  finalPrice: number;
  explanation_json: Record<string, any>;
}

export interface UnifiedETAResult {
  etaPickupMinutes: number | null;
  etaDropoffMinutes: number | null;
  etaMerchantReadyMinutes: number | null;
  totalEtaMinutes: number | null;
  distancePickupKm: number | null;
  distanceDropoffKm: number | null;
  trafficLevel: MobilityTrafficLevel;
  explanation_json: Record<string, any>;
}
