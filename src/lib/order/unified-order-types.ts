/**
 * Unified Order Flow — Canonical types linking order, payment, delivery, and tracking.
 */

export type UnifiedOrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "payment_secured"
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

  // Payment-based progression
  if (paymentStatus === "released") return "completed";
  if (paymentStatus === "secured" || paymentStatus === "authorized") {
    if (orderStatus === "preparing") return "preparing";
    if (orderStatus === "ready_for_pickup") return "ready_for_pickup";
    return "payment_secured";
  }
  if (orderStatus === "paid" || paymentStatus === "secured") return "paid";
  if (orderStatus === "pending" || orderStatus === "pending_payment") return "pending_payment";

  // Completed without delivery
  if (orderStatus === "completed") return "completed";
  if (orderStatus === "delivered") return "delivered";
  if (orderStatus === "accepted") return "preparing";

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
}, deliveryJob?: {
  assigned_at?: string | null;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  status?: string | null;
} | null): TimelineEvent[] {
  const hasDelivery = !!order.delivery_job_id || order.requires_delivery;
  const unified = resolveUnifiedStatus(
    order.status || null,
    order.payment_status || null,
    order.delivery_status || deliveryJob?.status || null,
    !!hasDelivery
  );
  const statusOrder: UnifiedOrderStatus[] = hasDelivery
    ? ["pending_payment", "paid", "payment_secured", "preparing", "ready_for_pickup", "driver_assignment", "driver_assigned", "picked_up", "on_the_way", "delivered", "completed"]
    : ["pending_payment", "paid", "payment_secured", "preparing", "ready_for_pickup", "delivered", "completed"];

  const currentIdx = statusOrder.indexOf(unified);

  const labelMap: Record<string, { label: string; icon: string }> = {
    pending_payment: { label: "Order Placed", icon: "📋" },
    paid: { label: "Payment Received", icon: "💳" },
    payment_secured: { label: "Payment Secured", icon: "🔒" },
    preparing: { label: "Preparing", icon: "👨‍🍳" },
    ready_for_pickup: { label: "Ready", icon: "📦" },
    driver_assignment: { label: "Finding Driver", icon: "🔍" },
    driver_assigned: { label: "Driver Assigned", icon: "🚗" },
    picked_up: { label: "Picked Up", icon: "📦" },
    on_the_way: { label: "On The Way", icon: "🛣️" },
    delivered: { label: "Delivered", icon: "🎉" },
    completed: { label: "Completed", icon: "✅" },
  };

  const timestampMap: Record<string, string | null> = {
    pending_payment: order.created_at || null,
    paid: order.payment_status === "secured" || order.payment_status === "released" ? order.created_at || null : null,
    payment_secured: order.payment_status === "secured" || order.payment_status === "released" ? order.created_at || null : null,
    preparing: null,
    ready_for_pickup: null,
    driver_assignment: null,
    driver_assigned: deliveryJob?.assigned_at || null,
    picked_up: deliveryJob?.picked_up_at || null,
    on_the_way: deliveryJob?.picked_up_at || null,
    delivered: deliveryJob?.delivered_at || null,
    completed: deliveryJob?.delivered_at || order.updated_at || null,
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
  pending_payment:    { label: "Pending Payment",  color: "#F59E0B",                     icon: "⏳" },
  paid:               { label: "Paid",             color: "#22C55E",                     icon: "💳" },
  payment_secured:    { label: "Payment Secured",  color: "#06B6D4",                     icon: "🔒" },
  preparing:          { label: "Preparing",        color: "#8B5CF6",                     icon: "👨‍🍳" },
  ready_for_pickup:   { label: "Ready",            color: "#3B82F6",                     icon: "📦" },
  driver_assignment:  { label: "Finding Driver",   color: "#F59E0B",                     icon: "🔍" },
  driver_assigned:    { label: "Driver Assigned",  color: "#4F46E5",                     icon: "🚗" },
  picked_up:          { label: "Picked Up",        color: "#22C55E",                     icon: "📦" },
  on_the_way:         { label: "On The Way",       color: "#06B6D4",                     icon: "🛣️" },
  delivered:          { label: "Delivered",         color: "#22C55E",                     icon: "🎉" },
  completed:          { label: "Completed",        color: "#22C55E",                     icon: "✅" },
  cancelled:          { label: "Cancelled",        color: "hsl(var(--destructive))",      icon: "❌" },
  refunded:           { label: "Refunded",         color: "#F59E0B",                     icon: "↩️" },
  failed:             { label: "Failed",           color: "hsl(var(--destructive))",      icon: "⚠️" },
};
