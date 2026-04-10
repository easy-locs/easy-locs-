/**
 * order.assignment — Driver/courier assignment for delivery orders.
 */

export interface OrderAssignment {
  orderId: string;
  driverId: string;
  driverOrbitId?: string;
  assignedAt: string;
  acceptedAt?: string;
  status: "pending" | "accepted" | "rejected" | "expired";
}

export function isAssignmentActive(a: OrderAssignment): boolean {
  return a.status === "pending" || a.status === "accepted";
}

export function canReassign(a: OrderAssignment): boolean {
  return a.status === "rejected" || a.status === "expired";
}
