import type { CurrencyCode } from "@/domains/shared/canonical-types";

export type RideMode = "taxi" | "delivery";

export type VehicleType =
  | "standard"
  | "premium"
  | "xl"
  | "moto"
  | "bike"
  | "electric"
  | "van";

export type DeliveryCategory = "food" | "grocery" | "parcel" | "errand" | "gift";

export type RideStatus =
  | "idle"
  | "searching"
  | "driver_assigned"
  | "driver_arriving"
  | "driver_arrived"
  | "in_progress"
  | "arriving_destination"
  | "completed"
  | "cancelled"
  | "failed";

export type DeliveryStatus =
  | "pending"
  | "searching_rider"
  | "rider_assigned"
  | "rider_arriving_pickup"
  | "rider_arrived_pickup"
  | "picked_up"
  | "in_transit"
  | "arriving_dropoff"
  | "delivered"
  | "cancelled"
  | "failed";

export type DriverStatus = "online" | "busy" | "offline" | "on_break";

export type PaymentMethod = "wallet" | "cash" | "card" | "mobile_money";

export type CancellationReason =
  | "changed_mind"
  | "driver_too_far"
  | "wrong_address"
  | "price_too_high"
  | "found_other_transport"
  | "emergency"
  | "other";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RideLocation {
  point: GeoPoint;
  address: string;
  label?: string;
  placeId?: string;
}

export interface VehicleOption {
  type: VehicleType;
  label: string;
  description: string;
  capacity: number;
  estimatedPrice: number;
  estimatedPriceRange: [number, number];
  etaMinutes: number;
  surgeMultiplier: number;
  surgeActive: boolean;
  available: boolean;
  icon: string;
}

export interface SurgeZone {
  zoneId: string;
  multiplier: number;
  demand: number;
  supply: number;
  level: "none" | "low" | "medium" | "high" | "extreme";
  expiresAt: string;
}

export interface RidePricing {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  surgeFee: number;
  bookingFee: number;
  tollFee: number;
  tip: number;
  discount: number;
  subtotal: number;
  totalPrice: number;
  currency: CurrencyCode;
  pricePerKm: number;
  pricePerMin: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
}

export interface DeliveryPricing {
  baseFee: number;
  distanceFee: number;
  weightFee: number;
  rushFee: number;
  surgeMultiplier: number;
  serviceFee: number;
  tip: number;
  totalPrice: number;
  currency: CurrencyCode;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
}

export interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  phone: string;
  rating: number;
  totalTrips: number;
  vehicleType: VehicleType;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  verified: boolean;
  status: DriverStatus;
}

export interface DriverLocation {
  driverId: string;
  point: GeoPoint;
  heading: number;
  speed: number;
  updatedAt: string;
}

export interface RideRequest {
  requestId: string;
  userId: string;
  mode: "taxi";
  pickup: RideLocation;
  dropoff: RideLocation;
  vehicleType: VehicleType;
  scheduledAt?: string;
  seats: number;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  pricing: RidePricing;
  status: RideStatus;
  driver?: DriverProfile;
  driverLocation?: DriverLocation;
  etaMinutes?: number;
  routePolyline?: string;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: CancellationReason;
  rating?: number;
  tipAmount?: number;
}

export interface DeliveryRequest {
  requestId: string;
  userId: string;
  mode: "delivery";
  category: DeliveryCategory;
  pickup: RideLocation;
  dropoff: RideLocation;
  merchantId?: string;
  merchantName?: string;
  orderId?: string;
  items?: DeliveryItem[];
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  pricing: DeliveryPricing;
  status: DeliveryStatus;
  rider?: DriverProfile;
  riderLocation?: DriverLocation;
  etaMinutes?: number;
  confirmationCode?: string;
  specialInstructions?: string;
  packageSize?: "small" | "medium" | "large";
  packageWeight?: number;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  rating?: number;
  tipAmount?: number;
}

export interface DeliveryItem {
  name: string;
  quantity: number;
  price: number;
}

export interface DriverEarnings {
  totalEarnings: number;
  totalTrips: number;
  totalTips: number;
  todayEarnings: number;
  todayTrips: number;
  weeklyEarnings: number;
  currency: CurrencyCode;
  pendingPayout: number;
  lastPayoutDate?: string;
}

export interface RideEvent {
  type:
    | "ride_requested"
    | "driver_assigned"
    | "driver_arriving"
    | "driver_arrived"
    | "ride_started"
    | "ride_completed"
    | "ride_cancelled"
    | "delivery_picked_up"
    | "delivery_in_transit"
    | "delivery_delivered"
    | "location_updated"
    | "eta_updated"
    | "surge_changed"
    | "payment_completed"
    | "tip_added"
    | "rating_submitted";
  requestId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface TrafficCondition {
  level: "low" | "moderate" | "heavy" | "gridlock";
  speedReduction: number;
  affectedRoutes: string[];
  estimatedClearTime?: string;
}

export interface RideSearchFilters {
  pickup: RideLocation;
  dropoff: RideLocation;
  mode: RideMode;
  vehicleType?: VehicleType;
  scheduledAt?: string;
  seats?: number;
  category?: DeliveryCategory;
  packageSize?: "small" | "medium" | "large";
}
