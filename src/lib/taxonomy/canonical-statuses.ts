/**
 * canonical-statuses — Single source of truth for all status enums.
 * No component should hardcode status strings. Import from here.
 */

export const ORDER_STATUSES = [
  "pending", "confirmed", "preparing", "ready",
  "assigned", "delivering", "completed", "cancelled", "refunded",
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const PAYMENT_STATUSES = [
  "pending", "authorized", "captured", "settled",
  "failed", "reversed", "refunded",
] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const DELIVERY_STATUSES = [
  "pending", "dispatched", "driver_assigned", "pickup",
  "delivering", "completed", "failed", "cancelled",
] as const;
export type DeliveryStatus = typeof DELIVERY_STATUSES[number];

export const BOOKING_STATUSES = [
  "pending", "confirmed", "checked_in", "checked_out",
  "cancelled", "no_show",
] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];

export const DEAL_STATUSES = [
  "draft", "active", "offer_sent", "counter_offer",
  "accepted", "signed", "cancelled", "expired",
] as const;
export type DealStatus = typeof DEAL_STATUSES[number];

export const CONVERSATION_STATUSES = [
  "active", "archived", "blocked", "deleted",
] as const;
export type ConversationStatus = typeof CONVERSATION_STATUSES[number];

export const LEASE_TYPES = [
  "empty", "furnished", "commercial", "seasonal",
] as const;
export type LeaseType = typeof LEASE_TYPES[number];

export const WALLET_MODES = [
  "topup", "transfer", "payment", "escrow", "settlement", "refund",
] as const;
export type WalletMode = typeof WALLET_MODES[number];

export const NOTIFICATION_TYPES = [
  "info", "payment", "message", "document",
  "dunning", "request", "receipt", "alert",
  "booking", "delivery", "system",
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const LISTING_TYPES = [
  "rental_long", "rental_seasonal", "sale", "commercial",
] as const;
export type ListingType = typeof LISTING_TYPES[number];

export const USER_ROLES = [
  "admin", "owner", "manager", "tenant", "customer",
  "merchant", "driver", "agent", "support",
] as const;
export type UserRole = typeof USER_ROLES[number];

export const SUPPORT_TICKET_STATUSES = [
  "open", "in_progress", "waiting_customer",
  "escalated", "resolved", "closed",
] as const;
export type SupportTicketStatus = typeof SUPPORT_TICKET_STATUSES[number];
