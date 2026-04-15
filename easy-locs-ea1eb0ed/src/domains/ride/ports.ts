import type { DomainResult, GeoPoint } from "../shared/types";

export type RideVehicleType = "economy" | "comfort" | "premium";

export type RideJobStatus =
  | "searching"
  | "accepted"
  | "rider_arriving_pickup"
  | "rider_arrived_pickup"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed_no_rider"
  | "expired";

export interface PriceBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeFare: number;
}

export interface RideEstimate {
  estimatedPrice: number;
  estimatedDuration: number;
  distanceKm: number;
  breakdown: PriceBreakdown;
  surgeMultiplier: number;
  currency: string;
}

export interface RequestRideCommand {
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  pickupLabel?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  dropoffLabel?: string;
  vehicleType: RideVehicleType;
  paymentMethod?: string;
  seatsRequested?: number;
}

export interface RideDriverInfo {
  userId: string;
  fullName: string;
  photoUrl?: string;
  plateNumber?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  ratingAvg: number;
  totalCompletedRides: number;
}

export interface RideDetail {
  id: string;
  status: RideJobStatus;
  customerUserId: string;
  riderUserId?: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  pickupLabel?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string;
  dropoffLabel?: string;
  vehicleType: string;
  quotedPrice: number;
  currentPrice: number;
  currency: string;
  driver?: RideDriverInfo;
  confirmationCode?: string;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DriverPeriodStats {
  totalEarnings: number;
  totalTrips: number;
  totalDistance: number;
  hoursOnline: number;
  acceptanceRate: number;
  currency: string;
  dailyBreakdown: Array<{
    date: string;
    earnings: number;
    trips: number;
  }>;
  recentTrips: Array<{
    id: string;
    pickupLabel: string;
    dropoffLabel: string;
    duration: number;
    distance: number;
    grossAmount: number;
    commission: number;
    netAmount: number;
    completedAt: string;
  }>;
}

export interface RideUseCases {
  estimatePrice(
    pickup: GeoPoint,
    dropoff: GeoPoint,
    vehicleType: RideVehicleType
  ): Promise<DomainResult<RideEstimate>>;

  requestRide(cmd: RequestRideCommand): Promise<DomainResult<{ jobId: string; confirmationCode: string }>>;

  respondToOffer(offerId: string, action: "accept" | "reject"): Promise<DomainResult<void>>;

  advanceStatus(jobId: string, newStatus: RideJobStatus): Promise<DomainResult<void>>;

  cancelRide(jobId: string, reason: string): Promise<DomainResult<void>>;

  getRideDetail(jobId: string): Promise<DomainResult<RideDetail>>;

  getRideHistory(userId: string, period: string): Promise<DomainResult<RideDetail[]>>;

  getDriverStats(driverId: string, period: string): Promise<DomainResult<DriverPeriodStats>>;

  rateClient(jobId: string, riderUserId: string, clientUserId: string, rating: number, comment?: string): Promise<DomainResult<void>>;

  toggleDriverOnline(online: boolean): Promise<DomainResult<void>>;

  subscribeToOffers(callback: (offer: any) => void): { unsubscribe: () => void };

  fetchJobRaw(jobId: string): Promise<DomainResult<any>>;
}

export interface RideRepository {
  findJobById(id: string): Promise<RideDetail | null>;
  findJobsByUser(userId: string, period: string): Promise<RideDetail[]>;
  findDriverCompletedJobs(driverId: string, startDate: string, endDate: string): Promise<any[]>;
  findDriverOfferStats(driverId: string, startDate: string, endDate: string): Promise<{ received: number; accepted: number }>;
  updateJobStatus(jobId: string, status: RideJobStatus): Promise<void>;
  fetchDriverInfo(userId: string): Promise<RideDriverInfo | null>;
  insertClientRating(data: { jobId: string; riderUserId: string; clientUserId: string; rating: number; comment?: string }): Promise<void>;
  toggleOnline(userId: string, online: boolean): Promise<void>;
  subscribeOffers(userId: string, callback: (payload: any) => void): { unsubscribe: () => void };
  fetchJobRaw(jobId: string): Promise<any | null>;
}

export interface RideEventPort {
  rideRequested(jobId: string, customerId: string): void;
  offerSent(jobId: string, riderId: string): void;
  rideAccepted(jobId: string, riderId: string, customerId: string): void;
  driverArriving(jobId: string, customerId: string): void;
  driverArrived(jobId: string, customerId: string): void;
  tripStarted(jobId: string, customerId: string): void;
  tripCompleted(jobId: string, customerId: string, riderId: string, fare: number, currency: string): void;
  rideCancelled(jobId: string, cancelledBy: string, reason: string): void;
}
