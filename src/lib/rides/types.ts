export type RideType = "taxi" | "delivery" | "courier";
export type BookingMode = "now" | "scheduled";

export type RideStatus =
  | "pending"
  | "scheduled"
  | "searching"
  | "accepted"
  | "driver_en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed";

export interface RideRow {
  id: string;
  rider_user_id: string;
  driver_user_id: string | null;
  ride_type: RideType;
  booking_mode: BookingMode;
  status: RideStatus;
  pickup_label: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_label: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  scheduled_for: string | null;
  notes: string | null;
  currency: string;
  estimated_price: number | null;
  final_price: number | null;
  passenger_name: string | null;
  passenger_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface RideEventRow {
  id: string;
  ride_id: string;
  event_type: string;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface TrackingPositionRow {
  id: string;
  ride_id: string;
  user_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed_kmh: number | null;
  accuracy_m: number | null;
  created_at: string;
}

export interface CreateRideInput {
  rideType: RideType;
  bookingMode: BookingMode;
  pickupLabel: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLabel: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  scheduledFor?: string | null;
  notes?: string | null;
  estimatedPrice?: number | null;
  currency?: string;
  passengerName?: string | null;
  passengerPhone?: string | null;
}
