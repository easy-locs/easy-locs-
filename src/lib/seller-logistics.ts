/**
 * Seller Logistics Engine — PASS69 Block C
 * Mission creation, driver assignment, reassignment, cancellation, disputes.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeliveryMissionStatus =
  | "draft"
  | "pending_assignment"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface DeliveryMission {
  id: string;
  sellerId: string;
  orgId: string;
  orderId: string;
  driverId: string | null;
  status: DeliveryMissionStatus;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  packageDescription: string;
  weightKg: number;
  priority: "standard" | "express" | "urgent";
  scheduledAt: number | null;
  createdAt: number;
  assignedAt: number | null;
  acceptedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  reassignmentCount: number;
  deliveryFee: number;
  currency: string;
  notes: string;
  /** History of all status changes */
  history: MissionEvent[];
}

export interface MissionEvent {
  status: DeliveryMissionStatus;
  timestamp: number;
  actorId: string;
  note?: string;
}

export interface Dispute {
  id: string;
  missionId: string;
  raisedBy: string;
  raisedByRole: "seller" | "buyer" | "driver";
  reason: DisputeReason;
  description: string;
  status: "open" | "investigating" | "resolved" | "escalated";
  resolution: string | null;
  resolvedAt: number | null;
  createdAt: number;
  evidence: string[];
}

export type DisputeReason =
  | "item_damaged"
  | "item_missing"
  | "wrong_item"
  | "late_delivery"
  | "no_delivery"
  | "driver_misconduct"
  | "customer_unavailable"
  | "payment_issue"
  | "other";

// ─── Mission Lifecycle ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<DeliveryMissionStatus, DeliveryMissionStatus[]> = {
  draft: ["pending_assignment", "cancelled"],
  pending_assignment: ["assigned", "cancelled"],
  assigned: ["accepted", "pending_assignment", "cancelled"], // pending_assignment = reassign
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled", "disputed"],
  completed: ["disputed"],
  cancelled: [],
  disputed: ["completed", "cancelled"],
};

export function isValidMissionTransition(
  from: DeliveryMissionStatus,
  to: DeliveryMissionStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Create a new delivery mission */
export function createMission(params: {
  sellerId: string;
  orgId: string;
  orderId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  packageDescription: string;
  weightKg: number;
  priority?: "standard" | "express" | "urgent";
  scheduledAt?: number;
  deliveryFee: number;
  currency?: string;
  notes?: string;
}): DeliveryMission {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    sellerId: params.sellerId,
    orgId: params.orgId,
    orderId: params.orderId,
    driverId: null,
    status: "draft",
    pickupAddress: params.pickupAddress,
    pickupLat: params.pickupLat,
    pickupLng: params.pickupLng,
    dropoffAddress: params.dropoffAddress,
    dropoffLat: params.dropoffLat,
    dropoffLng: params.dropoffLng,
    packageDescription: params.packageDescription,
    weightKg: params.weightKg,
    priority: params.priority || "standard",
    scheduledAt: params.scheduledAt ?? null,
    createdAt: now,
    assignedAt: null,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    reassignmentCount: 0,
    deliveryFee: params.deliveryFee,
    currency: params.currency || "EUR",
    notes: params.notes || "",
    history: [{ status: "draft", timestamp: now, actorId: params.sellerId }],
  };
}

/** Transition a mission to a new status */
export function transitionDeliveryMission(
  mission: DeliveryMission,
  newStatus: DeliveryMissionStatus,
  actorId: string,
  opts?: { driverId?: string; cancellationReason?: string; note?: string }
): DeliveryMission {
  if (!isValidMissionTransition(mission.status, newStatus)) {
    throw new Error(`Invalid transition: ${mission.status} → ${newStatus}`);
  }

  const now = Date.now();
  const updated: DeliveryMission = {
    ...mission,
    status: newStatus,
    history: [
      ...mission.history,
      { status: newStatus, timestamp: now, actorId, note: opts?.note },
    ],
  };

  switch (newStatus) {
    case "assigned":
      if (!opts?.driverId) throw new Error("driverId required for assignment");
      updated.driverId = opts.driverId;
      updated.assignedAt = now;
      break;
    case "accepted":
      updated.acceptedAt = now;
      break;
    case "pending_assignment":
      // Reassignment: clear driver
      updated.driverId = null;
      updated.assignedAt = null;
      updated.acceptedAt = null;
      updated.reassignmentCount = mission.reassignmentCount + 1;
      break;
    case "completed":
      updated.completedAt = now;
      break;
    case "cancelled":
      updated.cancelledAt = now;
      updated.cancelledBy = actorId;
      updated.cancellationReason = opts?.cancellationReason || null;
      break;
  }

  return updated;
}

/** Assign a driver to a pending mission */
export function assignDriver(
  mission: DeliveryMission,
  driverId: string,
  actorId: string
): DeliveryMission {
  if (mission.status !== "pending_assignment" && mission.status !== "draft") {
    // If already assigned, do reassignment
    if (mission.status === "assigned") {
      const reassigned = transitionDeliveryMission(mission, "pending_assignment", actorId, {
        note: `Reassigned from ${mission.driverId}`,
      });
      return transitionDeliveryMission(reassigned, "assigned", actorId, { driverId });
    }
    throw new Error(`Cannot assign driver in status: ${mission.status}`);
  }

  // Draft → pending_assignment → assigned
  let m = mission;
  if (m.status === "draft") {
    m = transitionDeliveryMission(m, "pending_assignment", actorId);
  }
  return transitionDeliveryMission(m, "assigned", actorId, { driverId });
}

// ─── Dispute Management ─────────────────────────────────────────────────────

export function createDispute(params: {
  missionId: string;
  raisedBy: string;
  raisedByRole: "seller" | "buyer" | "driver";
  reason: DisputeReason;
  description: string;
  evidence?: string[];
}): Dispute {
  return {
    id: crypto.randomUUID(),
    missionId: params.missionId,
    raisedBy: params.raisedBy,
    raisedByRole: params.raisedByRole,
    reason: params.reason,
    description: params.description,
    status: "open",
    resolution: null,
    resolvedAt: null,
    createdAt: Date.now(),
    evidence: params.evidence || [],
  };
}

export function resolveDispute(
  dispute: Dispute,
  resolution: string
): Dispute {
  if (dispute.status === "resolved") {
    throw new Error("Dispute already resolved");
  }
  return {
    ...dispute,
    status: "resolved",
    resolution,
    resolvedAt: Date.now(),
  };
}

export function escalateDispute(dispute: Dispute): Dispute {
  if (dispute.status === "resolved") {
    throw new Error("Cannot escalate a resolved dispute");
  }
  return { ...dispute, status: "escalated" };
}

// ─── Dashboard Metrics ───────────────────────────────────────────────────────

export interface SellerLogisticsMetrics {
  totalMissions: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  disputed: number;
  avgCompletionMinutes: number;
  reassignmentRate: number;
  totalRevenue: number;
  currency: string;
}

export function calculateSellerMetrics(missions: DeliveryMission[]): SellerLogisticsMetrics {
  const completed = missions.filter((m) => m.status === "completed");
  const completionTimes = completed
    .filter((m) => m.createdAt && m.completedAt)
    .map((m) => (m.completedAt! - m.createdAt) / 60000);

  const reassigned = missions.filter((m) => m.reassignmentCount > 0).length;

  return {
    totalMissions: missions.length,
    pending: missions.filter((m) => ["draft", "pending_assignment", "assigned"].includes(m.status)).length,
    inProgress: missions.filter((m) => ["accepted", "in_progress"].includes(m.status)).length,
    completed: completed.length,
    cancelled: missions.filter((m) => m.status === "cancelled").length,
    disputed: missions.filter((m) => m.status === "disputed").length,
    avgCompletionMinutes: completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0,
    reassignmentRate: missions.length > 0
      ? Math.round((reassigned / missions.length) * 100)
      : 0,
    totalRevenue: Math.round(completed.reduce((s, m) => s + m.deliveryFee, 0) * 100) / 100,
    currency: missions[0]?.currency || "EUR",
  };
}
