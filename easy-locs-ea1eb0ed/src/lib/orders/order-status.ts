/**
 * order-status.ts — Unified order lifecycle status system.
 * Single source of truth for all order states across customer, merchant, driver, and admin surfaces.
 */

export const ORDER_STATES = [
  "draft",
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "driver_search",
  "driver_assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
] as const;

export type OrderStatus = typeof ORDER_STATES[number];

interface StatusMeta {
  label: string;
  merchantLabel: string;
  customerLabel: string;
  color: string;
  bg: string;
  icon: string;
  isTerminal: boolean;
  isActive: boolean;
}

const STATUS_MAP: Record<OrderStatus, StatusMeta> = {
  draft:              { label: "Draft",            merchantLabel: "Draft",         customerLabel: "Draft",           color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))",    icon: "📝", isTerminal: false, isActive: false },
  pending_payment:    { label: "Pending Payment",  merchantLabel: "Awaiting Pay",  customerLabel: "Payment pending", color: "hsl(168 72% 44%)",              bg: "hsl(168 72% 44% / 0.12)",  icon: "💳", isTerminal: false, isActive: true },
  paid:               { label: "Paid",             merchantLabel: "Paid",          customerLabel: "Payment received",color: "hsl(142 70% 45%)",             bg: "hsl(142 70% 45% / 0.12)", icon: "✅", isTerminal: false, isActive: true },
  confirmed:          { label: "Confirmed",        merchantLabel: "Confirmed",     customerLabel: "Order confirmed", color: "hsl(200 80% 55%)",             bg: "hsl(200 80% 55% / 0.12)", icon: "👍", isTerminal: false, isActive: true },
  preparing:          { label: "Preparing",        merchantLabel: "Preparing",     customerLabel: "Being prepared",  color: "hsl(30 90% 55%)",              bg: "hsl(30 90% 55% / 0.12)",  icon: "👨‍🍳", isTerminal: false, isActive: true },
  ready_for_pickup:   { label: "Ready",            merchantLabel: "Ready for pickup", customerLabel: "Ready!",       color: "hsl(160 70% 45%)",             bg: "hsl(160 70% 45% / 0.12)", icon: "📦", isTerminal: false, isActive: true },
  driver_search:      { label: "Finding driver",   merchantLabel: "Finding driver",customerLabel: "Finding driver",  color: "hsl(270 70% 60%)",             bg: "hsl(270 70% 60% / 0.12)", icon: "🔍", isTerminal: false, isActive: true },
  driver_assigned:    { label: "Driver assigned",  merchantLabel: "Driver on way", customerLabel: "Driver assigned", color: "hsl(200 70% 50%)",             bg: "hsl(200 70% 50% / 0.12)", icon: "🚗", isTerminal: false, isActive: true },
  picked_up:          { label: "Picked up",        merchantLabel: "Picked up",     customerLabel: "Picked up",       color: "hsl(200 80% 50%)",             bg: "hsl(200 80% 50% / 0.12)", icon: "📬", isTerminal: false, isActive: true },
  on_the_way:         { label: "On the way",       merchantLabel: "In transit",    customerLabel: "On the way!",     color: "hsl(200 90% 45%)",             bg: "hsl(200 90% 45% / 0.12)", icon: "🛵", isTerminal: false, isActive: true },
  delivered:          { label: "Delivered",         merchantLabel: "Delivered",     customerLabel: "Delivered",        color: "hsl(142 70% 45%)",             bg: "hsl(142 70% 45% / 0.12)", icon: "🎉", isTerminal: false, isActive: false },
  completed:          { label: "Completed",        merchantLabel: "Completed",     customerLabel: "Completed",        color: "hsl(142 70% 40%)",             bg: "hsl(142 70% 40% / 0.12)", icon: "✅", isTerminal: true,  isActive: false },
  cancelled:          { label: "Cancelled",        merchantLabel: "Cancelled",     customerLabel: "Cancelled",        color: "hsl(0 70% 50%)",               bg: "hsl(0 70% 50% / 0.12)",   icon: "❌", isTerminal: true,  isActive: false },
  refunded:           { label: "Refunded",         merchantLabel: "Refunded",      customerLabel: "Refunded",         color: "hsl(0 60% 55%)",               bg: "hsl(0 60% 55% / 0.12)",   icon: "💸", isTerminal: true,  isActive: false },
  disputed:           { label: "Disputed",         merchantLabel: "Disputed",      customerLabel: "Under review",     color: "hsl(30 90% 50%)",              bg: "hsl(30 90% 50% / 0.12)",  icon: "⚠️", isTerminal: false, isActive: true },
};

export function getStatusMeta(status: string): StatusMeta {
  return STATUS_MAP[status as OrderStatus] ?? STATUS_MAP.draft;
}

export function getCustomerLabel(status: string): string {
  return getStatusMeta(status).customerLabel;
}

export function getMerchantLabel(status: string): string {
  return getStatusMeta(status).merchantLabel;
}

/** Valid transitions from each status */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft:            ["pending_payment", "cancelled"],
  pending_payment:  ["paid", "cancelled"],
  paid:             ["confirmed", "cancelled", "refunded"],
  confirmed:        ["preparing", "cancelled", "refunded"],
  preparing:        ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["driver_search", "picked_up", "completed"], // picked_up for self-pickup
  driver_search:    ["driver_assigned", "cancelled"],
  driver_assigned:  ["picked_up", "cancelled"],
  picked_up:        ["on_the_way"],
  on_the_way:       ["delivered"],
  delivered:        ["completed", "disputed"],
  completed:        ["disputed", "refunded"],
  cancelled:        [],
  refunded:         [],
  disputed:         ["refunded", "completed"],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from as OrderStatus];
  return allowed?.includes(to as OrderStatus) ?? false;
}

export function getNextActions(status: string): { label: string; nextStatus: OrderStatus }[] {
  const next = TRANSITIONS[status as OrderStatus] ?? [];
  return next.map(s => ({ label: STATUS_MAP[s].label, nextStatus: s }));
}

/** Normalize legacy/inconsistent status names to canonical ones */
export function normalizeStatus(raw: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    new: "confirmed",
    pending: "pending_payment",
    payment_pending: "pending_payment",
    accepted: "confirmed",
    in_progress: "preparing",
    cooking: "preparing",
    ready: "ready_for_pickup",
    picked: "picked_up",
    in_transit: "on_the_way",
    in_delivery: "on_the_way",
    done: "completed",
    failed: "cancelled",
    refund: "refunded",
    dispute: "disputed",
  };
  return map[raw] ?? (ORDER_STATES.includes(raw as any) ? raw as OrderStatus : "draft");
}

/** Payment states */
export type PaymentStatus = "unpaid" | "pending" | "authorized" | "captured" | "failed" | "refunded";

export function getPaymentStatusMeta(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    unpaid:     { label: "Unpaid",     color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" },
    pending:    { label: "Processing", color: "hsl(168 72% 44%)",              bg: "hsl(168 72% 44% / 0.12)" },
    authorized: { label: "Authorized", color: "hsl(200 80% 55%)",             bg: "hsl(200 80% 55% / 0.12)" },
    captured:   { label: "Paid",       color: "hsl(142 70% 45%)",             bg: "hsl(142 70% 45% / 0.12)" },
    failed:     { label: "Failed",     color: "hsl(0 70% 50%)",               bg: "hsl(0 70% 50% / 0.12)" },
    refunded:   { label: "Refunded",   color: "hsl(0 60% 55%)",               bg: "hsl(0 60% 55% / 0.12)" },
  };
  return map[status] ?? map.unpaid;
}
