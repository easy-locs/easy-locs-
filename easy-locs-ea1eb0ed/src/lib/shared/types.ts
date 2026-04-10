/**
 * Shared types for the unified application architecture.
 * Used by: notification engine, deep-link navigation, communication pipeline, detail drawers.
 */

/** All target types across the 3 business pillars */
export type TargetType =
  // Long-term
  | "lease" | "tenant" | "payment" | "receipt" | "document" | "intervention" | "invoice" | "dunning" | "expense"
  // Seasonal
  | "booking_request"
  // Marketplace / Concierge
  | "marketplace_booking" | "marketplace_service" | "concierge_order" | "concierge_service"
  // Real Estate
  | "real_estate_lead" | "real_estate_listing"
  // Deal Room
  | "deal" | "offer" | "counter_offer"
  // Orders / Commerce
  | "order" | "delivery" | "storefront_order"
  // General
  | "message";

/** Business module for notification categorization */
export type AppModule = "long_term" | "seasonal" | "marketplace" | "real_estate";

/** Notification status lifecycle */
export type NotificationStatus = "new" | "read" | "resolved";

/** Standard deep-link metadata — every notification MUST use this format */
export interface DeepLinkMeta {
  target_type: TargetType;
  target_id: string;
  target_url: string;
  module: AppModule;
  country_code: string;
  booking_id?: string;
  org_id?: string;
  property_id?: string;
  lease_id?: string;
  tenant_id?: string;
  document_id?: string;
  lead_id?: string;
}

/** Standard URL search params consumed by all modules */
export interface DeepLinkParams {
  booking?: string;
  record?: string;
  tab?: string;
  country?: string;
}

/** Standard notification creation payload */
export interface NotificationPayload {
  userId: string;
  orgId: string;
  type: "info" | "payment" | "message" | "document" | "dunning" | "request" | "receipt";
  title: string;
  message: string;
  meta: DeepLinkMeta;
}

/** Standard communication event — triggers message + notification + email */
export interface CommunicationEvent {
  orgId: string;
  senderId?: string;
  recipientUserId?: string;
  recipientEmail?: string;
  subject: string;
  message: string;
  category: string;
  emailLocale?: string;
  meta: DeepLinkMeta;
  attachmentUrl?: string;
  attachmentName?: string;
}
