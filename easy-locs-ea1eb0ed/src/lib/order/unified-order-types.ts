/**
 * Unified Order Flow — Canonical types linking order, payment, delivery, and tracking.
 */
import { STATUS_COLORS } from "@/config/colors";

export type UnifiedOrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "payment_secured"
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "driver_assignment"
  | "driver_assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed";

export type PaymentFlowStatus =
  | "pending"
  | "authorized"
  | "secured"
  | "released"
  | "refunded"
  | "failed"
  | "cancelled";

export type UserRole = "buyer" | "seller" | "driver" | "dispatcher";

/** Maps raw DB statuses to unified order status */
export function resolveUnifiedStatus(
  orderStatus: string | null,
  paymentStatus: string | null,
  deliveryStatus: string | null,
  requiresDelivery: boolean
): UnifiedOrderStatus {
  // Terminal states
  if (orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "refunded") return "refunded";
  if (orderStatus === "failed") return "failed";

  // Delivery progression overrides
  if (requiresDelivery && deliveryStatus) {
    if (["completed", "delivered"].includes(deliveryStatus)) return "delivered";
    if (["in_progress", "on_the_way", "arriving_dropoff"].includes(deliveryStatus)) return "on_the_way";
    if (["picked_up"].includes(deliveryStatus)) return "picked_up";
    if (["accepted", "assigned"].includes(deliveryStatus)) return "driver_assigned";
    if (["pending"].includes(deliveryStatus)) return "driver_assignment";
  }

  // Food order state machine statuses (must precede generic payment fallback)
  if (orderStatus === "dispatching") return "driver_assignment";
  if (orderStatus === "in_delivery") return "on_the_way";
  if (orderStatus === "accepted") return "accepted";
  if (orderStatus === "preparing") return "preparing";
  if (orderStatus === "ready_for_pickup") return "ready_for_pickup";
  if (orderStatus === "delivered") return "delivered";
  if (orderStatus === "completed") return "completed";

  // Payment-based progression
  if (paymentStatus === "released") return "completed";
  if (paymentStatus === "secured" || paymentStatus === "authorized") {
    return "payment_secured";
  }
  if (orderStatus === "paid" || paymentStatus === "secured") return "paid";
  if (orderStatus === "pending" || orderStatus === "pending_payment") return "pending_payment";

  return (orderStatus as UnifiedOrderStatus) || "pending_payment";
}

/** Unified timeline event */
export interface TimelineEvent {
  key: string;
  label: string;
  icon: string;
  timestamp: string | null;
  active: boolean;
  current: boolean;
}

/** Build a unified timeline from order, payment, and delivery data */
export function buildUnifiedTimeline(order: {
  created_at?: string | null;
  payment_status?: string | null;
  status?: string | null;
  delivery_status?: string | null;
  delivery_job_id?: string | null;
  requires_delivery?: boolean | null;
  shipped_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
}, deliveryJob?: {
  assigned_at?: string | null;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  status?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_plate?: string | null;
} | null): TimelineEvent[] {
  const hasDelivery = !!order.delivery_job_id || order.requires_delivery;
  const meta = (order.metadata ?? {}) as Record<string, string | undefined>;
  const unified = resolveUnifiedStatus(
    order.status || null,
    order.payment_status || null,
    order.delivery_status || deliveryJob?.status || null,
    !!hasDelivery
  );
  const statusOrder: UnifiedOrderStatus[] = hasDelivery
    ? ["pending_payment", "paid", "payment_secured", "accepted", "preparing", "ready_for_pickup", "driver_assignment", "driver_assigned", "picked_up", "on_the_way", "delivered", "completed"]
    : ["pending_payment", "paid", "payment_secured", "accepted", "preparing", "ready_for_pickup", "delivered", "completed"];

  const currentIdx = statusOrder.indexOf(unified);

  const riderDetail = deliveryJob?.driver_name
    ? ` — ${deliveryJob.driver_name}${deliveryJob.vehicle_plate ? ` (${deliveryJob.vehicle_plate})` : ""}`
    : "";

  const labelMap: Record<string, { label: string; icon: string }> = {
    pending_payment: { label: "Order Placed", icon: "📋" },
    paid: { label: "Payment Received", icon: "💳" },
    payment_secured: { label: "Payment Secured", icon: "🔒" },
    accepted: { label: "Accepted by Restaurant", icon: "✅" },
    preparing: { label: "Being Prepared", icon: "👨‍🍳" },
    ready_for_pickup: { label: "Ready for Pickup", icon: "📦" },
    driver_assignment: { label: "Finding Rider", icon: "🔍" },
    driver_assigned: { label: `Rider Assigned${riderDetail}`, icon: "🛵" },
    picked_up: { label: "Picked Up", icon: "📦" },
    on_the_way: { label: `On The Way${riderDetail}`, icon: "🛣️" },
    delivered: { label: "Delivered", icon: "🎉" },
    completed: { label: "Completed", icon: "✅" },
  };

  const timestampMap: Record<string, string | null> = {
    pending_payment: order.created_at || null,
    paid: order.payment_status === "secured" || order.payment_status === "released" ? order.created_at || null : null,
    payment_secured: order.payment_status === "secured" || order.payment_status === "released" ? order.created_at || null : null,
    accepted: meta.accepted_at || null,
    preparing: meta.preparing_started_at || null,
    ready_for_pickup: meta.ready_at || null,
    driver_assignment: meta.dispatched_at || null,
    driver_assigned: deliveryJob?.assigned_at || deliveryJob?.accepted_at || null,
    picked_up: deliveryJob?.picked_up_at || null,
    on_the_way: meta.in_delivery_at || deliveryJob?.picked_up_at || null,
    delivered: meta.delivered_at || deliveryJob?.delivered_at || null,
    completed: meta.delivered_at || deliveryJob?.delivered_at || order.updated_at || null,
  };

  return statusOrder.map((s, i) => ({
    key: s,
    label: labelMap[s]?.label || s,
    icon: labelMap[s]?.icon || "⏳",
    timestamp: timestampMap[s] || null,
    active: i <= currentIdx,
    current: i === currentIdx,
  }));
}

/** CTA definition */
export interface OrderCTA {
  label: string;
  action: string;
  variant: "default" | "destructive" | "outline" | "success";
  icon?: string;
}

/** Get CTAs based on role and unified status */
export function getOrderCTAs(status: UnifiedOrderStatus, role: UserRole): OrderCTA[] {
  if (role === "buyer") {
    switch (status) {
      case "pending_payment":
        return [
          { label: "Pay Now", action: "pay", variant: "default", icon: "💳" },
          { label: "Cancel", action: "cancel", variant: "destructive" },
        ];
      case "paid": case "payment_secured": case "preparing":
        return [
          { label: "Track Order", action: "track", variant: "default" },
          { label: "Contact Seller", action: "contact_seller", variant: "outline" },
          { label: "Cancel Order", action: "cancel", variant: "destructive" },
        ];
      case "driver_assigned": case "picked_up": case "on_the_way":
        return [
          { label: "Track Delivery", action: "track", variant: "default" },
          { label: "Contact Driver", action: "contact_driver", variant: "outline" },
        ];
      case "delivered":
        return [
          { label: "Confirm Received", action: "confirm_received", variant: "success" },
          { label: "Report Issue", action: "support", variant: "outline" },
        ];
      case "completed":
        return [
          { label: "Reorder", action: "reorder", variant: "default" },
        ];
      case "cancelled": case "refunded":
        return [
          { label: "Reorder", action: "reorder", variant: "default" },
        ];
      default:
        return [];
    }
  }

  if (role === "seller") {
    switch (status) {
      case "paid": case "payment_secured":
        return [
          { label: "Mark Preparing", action: "mark_preparing", variant: "default" },
          { label: "Contact Buyer", action: "contact_buyer", variant: "outline" },
        ];
      case "preparing":
        return [
          { label: "Mark Ready", action: "mark_ready", variant: "success" },
          { label: "Request Driver", action: "request_driver", variant: "default" },
        ];
      case "ready_for_pickup":
        return [
          { label: "Request Driver", action: "request_driver", variant: "default" },
          { label: "Confirm Handoff", action: "confirm_handoff", variant: "success" },
        ];
      case "driver_assigned": case "picked_up": case "on_the_way":
        return [
          { label: "Contact Driver", action: "contact_driver", variant: "outline" },
        ];
      case "delivered": case "completed":
        return [
          { label: "View Summary", action: "summary", variant: "default" },
        ];
      default:
        return [];
    }
  }

  if (role === "driver") {
    switch (status) {
      case "driver_assigned":
        return [
          { label: "Accept", action: "accept_mission", variant: "default" },
          { label: "Reject", action: "reject_mission", variant: "destructive" },
        ];
      case "picked_up": case "on_the_way":
        return [
          { label: "Navigate", action: "navigate_dropoff", variant: "default" },
          { label: "Confirm Delivered", action: "confirm_delivered", variant: "success" },
        ];
      default:
        return [];
    }
  }

  // dispatcher
  switch (status) {
    case "driver_assignment": case "ready_for_pickup":
      return [
        { label: "Assign Driver", action: "assign_driver", variant: "default" },
        { label: "Cancel", action: "cancel", variant: "destructive" },
      ];
    case "driver_assigned":
      return [
        { label: "Reassign", action: "reassign_driver", variant: "outline" },
        { label: "Cancel Mission", action: "cancel_mission", variant: "destructive" },
      ];
    default:
      return [];
  }
}

/** Status display config */
export const ORDER_STATUS_DISPLAY: Record<UnifiedOrderStatus, { label: string; color: string; icon: string }> = {
  draft:              { label: "Draft",            color: "hsl(var(--muted-foreground))", icon: "📝" },
  pending_payment:    { label: "Pending Payment",  color: STATUS_COLORS.pending_payment,  icon: "⏳" },
  paid:               { label: "Paid",             color: STATUS_COLORS.paid,             icon: "💳" },
  payment_secured:    { label: "Payment Secured",  color: STATUS_COLORS.payment_secured,  icon: "🔒" },
  preparing:          { label: "Preparing",        color: STATUS_COLORS.preparing_order,   icon: "👨‍🍳" },
  ready_for_pickup:   { label: "Ready",            color: STATUS_COLORS.ready_for_pickup,  icon: "📦" },
  driver_assignment:  { label: "Finding Driver",   color: STATUS_COLORS.driver_assignment, icon: "🔍" },
  driver_assigned:    { label: "Driver Assigned",  color: STATUS_COLORS.driver_assigned,   icon: "🚗" },
  picked_up:          { label: "Picked Up",        color: STATUS_COLORS.picked_up,        icon: "📦" },
  on_the_way:         { label: "On The Way",       color: STATUS_COLORS.on_the_way,       icon: "🛣️" },
  delivered:          { label: "Delivered",         color: STATUS_COLORS.delivered,         icon: "🎉" },
  completed:          { label: "Completed",        color: STATUS_COLORS.completed,         icon: "✅" },
  cancelled:          { label: "Cancelled",        color: "hsl(var(--destructive))",       icon: "❌" },
  refunded:           { label: "Refunded",         color: STATUS_COLORS.refunded,          icon: "↩️" },
  failed:             { label: "Failed",           color: "hsl(var(--destructive))",       icon: "⚠️" },
};
