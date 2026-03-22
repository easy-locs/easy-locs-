/**
 * Buyer Delivery Experience — PASS69 Block D
 * Live tracking, confirmation codes, photo proof, driver rating, support requests.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type TrackingStatus =
  | "order_confirmed"
  | "driver_assigned"
  | "heading_to_pickup"
  | "at_pickup"
  | "in_transit"
  | "nearby"
  | "arrived"
  | "delivered";

export interface DeliveryTracking {
  orderId: string;
  missionId: string;
  status: TrackingStatus;
  driverName: string;
  driverPhoto: string | null;
  driverRating: number;
  vehicleType: string;
  currentLat: number;
  currentLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedArrivalMinutes: number;
  distanceRemainingKm: number;
  confirmationCode: string;
  timeline: TrackingEvent[];
  lastUpdatedAt: number;
}

export interface TrackingEvent {
  status: TrackingStatus;
  timestamp: number;
  message: string;
}

export interface DeliveryProof {
  missionId: string;
  photoUrl: string;
  signatureUrl: string | null;
  confirmedByCode: boolean;
  confirmationCode: string;
  deliveredAt: number;
  recipientName: string | null;
  notes: string;
}

export interface DriverRating {
  missionId: string;
  driverId: string;
  buyerId: string;
  rating: number; // 1–5
  categories: RatingCategory[];
  comment: string;
  createdAt: number;
}

export type RatingCategory =
  | "speed"
  | "communication"
  | "package_care"
  | "professionalism"
  | "friendliness";

export interface SupportRequest {
  id: string;
  missionId: string;
  userId: string;
  userRole: "buyer" | "seller" | "driver";
  category: SupportCategory;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  resolution: string | null;
  createdAt: number;
  resolvedAt: number | null;
}

export type SupportCategory =
  | "delivery_issue"
  | "damaged_item"
  | "missing_item"
  | "wrong_delivery"
  | "driver_issue"
  | "payment_issue"
  | "refund_request"
  | "other";

// ─── Confirmation Code ──────────────────────────────────────────────────────

/** Generate a 6-digit confirmation code */
export function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Validate confirmation code (constant-time comparison) */
export function validateConfirmationCode(input: string, expected: string): boolean {
  if (input.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < input.length; i++) {
    result |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// ─── Live Tracking ───────────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<TrackingStatus, string> = {
  order_confirmed: "Your order has been confirmed",
  driver_assigned: "A driver has been assigned",
  heading_to_pickup: "Driver is heading to pickup location",
  at_pickup: "Driver has arrived at pickup",
  in_transit: "Your order is on its way",
  nearby: "Driver is nearby",
  arrived: "Driver has arrived at your location",
  delivered: "Order delivered successfully",
};

const TRACKING_ORDER: TrackingStatus[] = [
  "order_confirmed", "driver_assigned", "heading_to_pickup",
  "at_pickup", "in_transit", "nearby", "arrived", "delivered",
];

/** Create initial tracking state */
export function createTracking(params: {
  orderId: string;
  missionId: string;
  driverName: string;
  driverPhoto?: string;
  driverRating: number;
  vehicleType: string;
  currentLat: number;
  currentLng: number;
  dropoffLat: number;
  dropoffLng: number;
}): DeliveryTracking {
  const code = generateConfirmationCode();
  const now = Date.now();
  return {
    orderId: params.orderId,
    missionId: params.missionId,
    status: "order_confirmed",
    driverName: params.driverName,
    driverPhoto: params.driverPhoto || null,
    driverRating: params.driverRating,
    vehicleType: params.vehicleType,
    currentLat: params.currentLat,
    currentLng: params.currentLng,
    dropoffLat: params.dropoffLat,
    dropoffLng: params.dropoffLng,
    estimatedArrivalMinutes: 0,
    distanceRemainingKm: 0,
    confirmationCode: code,
    timeline: [{ status: "order_confirmed", timestamp: now, message: STATUS_MESSAGES.order_confirmed }],
    lastUpdatedAt: now,
  };
}

/** Update tracking status */
export function updateTrackingStatus(
  tracking: DeliveryTracking,
  newStatus: TrackingStatus
): DeliveryTracking {
  const currentIdx = TRACKING_ORDER.indexOf(tracking.status);
  const newIdx = TRACKING_ORDER.indexOf(newStatus);

  if (newIdx <= currentIdx) {
    throw new Error(`Cannot move from ${tracking.status} to ${newStatus}`);
  }

  const now = Date.now();
  return {
    ...tracking,
    status: newStatus,
    timeline: [
      ...tracking.timeline,
      { status: newStatus, timestamp: now, message: STATUS_MESSAGES[newStatus] },
    ],
    lastUpdatedAt: now,
  };
}

/** Update driver GPS position and recalculate ETA */
export function updateDriverPosition(
  tracking: DeliveryTracking,
  lat: number,
  lng: number,
  speedKmh: number = 30
): DeliveryTracking {
  const R = 6371;
  const dLat = ((tracking.dropoffLat - lat) * Math.PI) / 180;
  const dLng = ((tracking.dropoffLng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat * Math.PI) / 180) *
    Math.cos((tracking.dropoffLat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const eta = Math.round((distKm / speedKmh) * 60);

  return {
    ...tracking,
    currentLat: lat,
    currentLng: lng,
    distanceRemainingKm: Math.round(distKm * 100) / 100,
    estimatedArrivalMinutes: eta,
    lastUpdatedAt: Date.now(),
  };
}

/** Get progress percentage (0–100) */
export function getTrackingProgress(tracking: DeliveryTracking): number {
  const idx = TRACKING_ORDER.indexOf(tracking.status);
  return Math.round((idx / (TRACKING_ORDER.length - 1)) * 100);
}

// ─── Delivery Proof ──────────────────────────────────────────────────────────

/** Create delivery proof record */
export function createDeliveryProof(params: {
  missionId: string;
  photoUrl: string;
  confirmationCode: string;
  expectedCode: string;
  signatureUrl?: string;
  recipientName?: string;
  notes?: string;
}): { proof: DeliveryProof; codeValid: boolean } {
  const codeValid = validateConfirmationCode(params.confirmationCode, params.expectedCode);
  return {
    proof: {
      missionId: params.missionId,
      photoUrl: params.photoUrl,
      signatureUrl: params.signatureUrl || null,
      confirmedByCode: codeValid,
      confirmationCode: params.confirmationCode,
      deliveredAt: Date.now(),
      recipientName: params.recipientName || null,
      notes: params.notes || "",
    },
    codeValid,
  };
}

// ─── Driver Rating ───────────────────────────────────────────────────────────

/** Create a driver rating */
export function createDriverRating(params: {
  missionId: string;
  driverId: string;
  buyerId: string;
  rating: number;
  categories?: RatingCategory[];
  comment?: string;
}): DriverRating {
  if (params.rating < 1 || params.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  return {
    missionId: params.missionId,
    driverId: params.driverId,
    buyerId: params.buyerId,
    rating: params.rating,
    categories: params.categories || [],
    comment: params.comment || "",
    createdAt: Date.now(),
  };
}

/** Aggregate driver ratings */
export function aggregateRatings(ratings: DriverRating[]): {
  avgRating: number;
  totalRatings: number;
  distribution: Record<number, number>;
  topCategories: Array<{ category: RatingCategory; count: number }>;
} {
  if (ratings.length === 0) {
    return { avgRating: 0, totalRatings: 0, distribution: {}, topCategories: [] };
  }

  const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
  const dist: Record<number, number> = {};
  for (const r of ratings) {
    dist[r.rating] = (dist[r.rating] || 0) + 1;
  }

  const catCount = new Map<RatingCategory, number>();
  for (const r of ratings) {
    for (const c of r.categories) {
      catCount.set(c, (catCount.get(c) || 0) + 1);
    }
  }

  return {
    avgRating: Math.round(avg * 10) / 10,
    totalRatings: ratings.length,
    distribution: dist,
    topCategories: Array.from(catCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ─── Support Requests ────────────────────────────────────────────────────────

/** Create support request */
export function createSupportRequest(params: {
  missionId: string;
  userId: string;
  userRole: "buyer" | "seller" | "driver";
  category: SupportCategory;
  subject: string;
  description: string;
  priority?: "low" | "medium" | "high" | "urgent";
}): SupportRequest {
  return {
    id: crypto.randomUUID(),
    missionId: params.missionId,
    userId: params.userId,
    userRole: params.userRole,
    category: params.category,
    subject: params.subject,
    description: params.description,
    status: "open",
    priority: params.priority || "medium",
    resolution: null,
    createdAt: Date.now(),
    resolvedAt: null,
  };
}

/** Resolve support request */
export function resolveSupportRequest(
  request: SupportRequest,
  resolution: string
): SupportRequest {
  if (request.status === "resolved" || request.status === "closed") {
    throw new Error("Request already resolved/closed");
  }
  return { ...request, status: "resolved", resolution, resolvedAt: Date.now() };
}

/** Auto-prioritize based on category */
export function autoPrioritize(category: SupportCategory): "low" | "medium" | "high" | "urgent" {
  switch (category) {
    case "missing_item":
    case "wrong_delivery":
      return "high";
    case "damaged_item":
    case "driver_issue":
      return "high";
    case "refund_request":
    case "payment_issue":
      return "medium";
    case "delivery_issue":
      return "medium";
    case "other":
      return "low";
  }
}
