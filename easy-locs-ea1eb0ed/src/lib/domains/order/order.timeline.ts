/**
 * order.timeline — Order lifecycle state machine.
 */

export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  actorId?: string;
  note?: string;
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function appendTimelineEntry(
  timeline: OrderTimelineEntry[],
  status: OrderStatus,
  actorId?: string,
  note?: string
): OrderTimelineEntry[] {
  return [
    ...timeline,
    { status, timestamp: new Date().toISOString(), actorId, note },
  ];
}
