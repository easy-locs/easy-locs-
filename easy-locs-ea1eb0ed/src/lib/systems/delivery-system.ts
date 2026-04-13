import { platformBus } from "@/lib/shared/platform-bus";

export type DriverStatus = "offline" | "online" | "busy" | "returning";
export type DeliveryStatus = "pending" | "assigned" | "pickup_arrived" | "picked_up" | "in_transit" | "delivered" | "failed" | "cancelled";
export type DispatchStrategy = "nearest" | "round_robin" | "broadcast" | "manual";

export interface CourierProfile {
  courierId: string;
  userId: string;
  status: DriverStatus;
  vehicleType: "bicycle" | "motorcycle" | "car" | "van";
  currentLat: number | null;
  currentLng: number | null;
  activeDeliveryId: string | null;
  rating: number;
  completedDeliveries: number;
  zone: string;
  maxDistanceKm: number;
}

export interface DispatchRule {
  vertical: string;
  strategy: DispatchStrategy;
  maxRadiusKm: number;
  timeoutSeconds: number;
  maxAttempts: number;
  priorityFactors: Array<"distance" | "rating" | "completion_rate" | "vehicle_type">;
}

export interface DeliveryMission {
  missionId: string;
  orderId: string;
  courierId: string | null;
  status: DeliveryStatus;
  pickupAddress: { lat: number; lng: number; label: string };
  dropoffAddress: { lat: number; lng: number; label: string };
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  fee: number;
  currency: string;
  dispatchedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  proofOfDelivery: { photoUrl: string | null; signatureUrl: string | null; recipientName: string | null };
  failureReason: string | null;
}

export interface PositionUpdate {
  courierId: string;
  missionId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
}

const DISPATCH_RULES: DispatchRule[] = [
  { vertical: "food", strategy: "nearest", maxRadiusKm: 5, timeoutSeconds: 60, maxAttempts: 3, priorityFactors: ["distance", "rating"] },
  { vertical: "retail", strategy: "nearest", maxRadiusKm: 10, timeoutSeconds: 120, maxAttempts: 3, priorityFactors: ["distance", "vehicle_type"] },
  { vertical: "marketplace", strategy: "broadcast", maxRadiusKm: 15, timeoutSeconds: 180, maxAttempts: 5, priorityFactors: ["distance", "completion_rate"] },
];

export function getDispatchRule(vertical: string): DispatchRule {
  return DISPATCH_RULES.find((r) => r.vertical === vertical) ??
    { vertical, strategy: "nearest", maxRadiusKm: 10, timeoutSeconds: 120, maxAttempts: 3, priorityFactors: ["distance"] };
}

export function calculateETA(distanceKm: number, vehicleType: CourierProfile["vehicleType"]): number {
  const speeds: Record<string, number> = { bicycle: 12, motorcycle: 25, car: 30, van: 25 };
  const speed = speeds[vehicleType] ?? 20;
  return Math.ceil((distanceKm / speed) * 60);
}

export function scoreCourier(courier: CourierProfile, pickupLat: number, pickupLng: number): number {
  if (!courier.currentLat || !courier.currentLng) return 0;
  const dist = Math.sqrt(Math.pow(courier.currentLat - pickupLat, 2) + Math.pow(courier.currentLng - pickupLng, 2)) * 111;
  if (dist > courier.maxDistanceKm) return 0;
  const distScore = Math.max(0, 100 - dist * 10);
  const ratingScore = courier.rating * 20;
  return distScore * 0.6 + ratingScore * 0.4;
}

export function emitDeliveryDispatched(mission: DeliveryMission): void {
  platformBus.emit("delivery:dispatched", {
    missionId: mission.missionId,
    orderId: mission.orderId,
    courierId: mission.courierId,
    estimatedMinutes: mission.estimatedDurationMinutes,
  }, "delivery-system");
}

export function emitDeliveryStatusChanged(missionId: string, status: DeliveryStatus, orderId: string): void {
  const eventMap: Partial<Record<DeliveryStatus, string>> = {
    assigned: "delivery:driver_assigned",
    pickup_arrived: "delivery:pickup_arrived",
    picked_up: "delivery:picked_up",
    in_transit: "delivery:in_progress",
    delivered: "delivery:delivered",
    failed: "delivery:failed",
  };
  const eventName = eventMap[status];
  if (eventName) {
    platformBus.emit(eventName, { missionId, orderId, status, timestamp: Date.now() }, "delivery-system");
  }
}

export function emitPositionUpdate(update: PositionUpdate): void {
  platformBus.emit("tracking:position_updated", update, "delivery-system");
}

export function emitDeliveryCompleted(mission: DeliveryMission): void {
  platformBus.emit("delivery:completed", {
    missionId: mission.missionId,
    orderId: mission.orderId,
    courierId: mission.courierId,
    proofOfDelivery: mission.proofOfDelivery,
  }, "delivery-system");
  platformBus.emit("delivery:validated", {
    missionId: mission.missionId,
    orderId: mission.orderId,
  }, "delivery-system");
}
