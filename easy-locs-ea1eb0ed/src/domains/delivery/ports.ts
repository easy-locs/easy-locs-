/**
 * Delivery Domain — Port interfaces (hexagonal architecture).
 * Dispatch, tracking, driver management, multi-mode fulfillment.
 */
import type { Money, GeoPoint, DomainResult } from "../shared/types";

// ── Aggregates ──
export interface DeliveryJob {
  id: string;
  orderId: string;
  driverId?: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  status: "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  mode: "food" | "grocery" | "parcel" | "errand";
  estimatedMinutes?: number;
  fee: Money;
  createdAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  vehicleType: string;
  location: GeoPoint;
  status: "online" | "busy" | "offline";
  rating: number;
}

export interface TrackingUpdate {
  jobId: string;
  driverId: string;
  location: GeoPoint;
  timestamp: string;
  eta?: number;
}

// ── Inbound Ports ──
export interface DeliveryUseCases {
  dispatchJob(cmd: DispatchCommand): Promise<DomainResult<DeliveryJob>>;
  assignDriver(jobId: string, driverId: string): Promise<DomainResult<void>>;
  updateTracking(update: TrackingUpdate): Promise<DomainResult<void>>;
  completeDelivery(jobId: string, proof?: string): Promise<DomainResult<void>>;
  cancelJob(jobId: string, reason: string): Promise<DomainResult<void>>;
  getDriverEarnings(driverId: string, period: string): Promise<DomainResult<DriverEarnings>>;
}

export interface DispatchCommand {
  orderId: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  mode: DeliveryJob["mode"];
  fee: Money;
}

export interface DriverEarnings {
  total: Money;
  trips: number;
  tips: Money;
  period: string;
}

// ── Outbound Ports ──
export interface DeliveryJobRepository {
  findById(id: string): Promise<DeliveryJob | null>;
  findActive(): Promise<DeliveryJob[]>;
  save(job: DeliveryJob): Promise<void>;
  updateStatus(id: string, status: DeliveryJob["status"]): Promise<void>;
}

export interface DriverRepository {
  findById(id: string): Promise<Driver | null>;
  findNearby(location: GeoPoint, radiusKm: number): Promise<Driver[]>;
  updateLocation(driverId: string, location: GeoPoint): Promise<void>;
  updateStatus(driverId: string, status: Driver["status"]): Promise<void>;
}

export interface DispatchEnginePort {
  findBestDriver(pickup: GeoPoint, mode: DeliveryJob["mode"]): Promise<Driver | null>;
  calculateETA(from: GeoPoint, to: GeoPoint): Promise<number>;
  calculateFee(from: GeoPoint, to: GeoPoint, mode: DeliveryJob["mode"]): Promise<Money>;
}

export interface DeliveryEventPort {
  jobDispatched(job: DeliveryJob): void;
  driverAssigned(job: DeliveryJob, driver: Driver): void;
  trackingUpdated(update: TrackingUpdate): void;
  delivered(job: DeliveryJob): void;
  jobCancelled(jobId: string, reason: string): void;
}
