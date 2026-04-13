export const ENTITY_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  ARCHIVED: "archived",
  DELETED: "deleted",
} as const;
export type EntityStatus = (typeof ENTITY_STATUS)[keyof typeof ENTITY_STATUS];

export const TRANSACTION_STATUS = {
  INITIATED: "initiated",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

export const PUBLICATION_STATUS = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  PUBLISHED: "published",
  PAUSED: "paused",
  UNPUBLISHED: "unpublished",
  REJECTED: "rejected",
  EXPIRED: "expired",
  SOLD: "sold",
} as const;
export type PublicationStatus = (typeof PUBLICATION_STATUS)[keyof typeof PUBLICATION_STATUS];

export const PAYMENT_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  SETTLED: "settled",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  REVERSED: "reversed",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const FULFILLMENT_STATUS = {
  UNFULFILLED: "unfulfilled",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  RETURNED: "returned",
  CANCELLED: "cancelled",
} as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUS)[keyof typeof FULFILLMENT_STATUS];

export const KYC_STATUS = {
  NOT_STARTED: "not_started",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;
export type KycStatus = (typeof KYC_STATUS)[keyof typeof KYC_STATUS];

export const CONVERSATION_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  DELETED: "deleted",
  BLOCKED: "blocked",
} as const;
export type ConversationStatus = (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS];

export const MESSAGE_STATUS = {
  SENDING: "sending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
} as const;
export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export const CALL_STATUS = {
  RINGING: "ringing",
  ANSWERED: "answered",
  REJECTED: "rejected",
  ENDED: "ended",
  MISSED: "missed",
  FAILED: "failed",
} as const;
export type CallStatus = (typeof CALL_STATUS)[keyof typeof CALL_STATUS];

export const ONBOARDING_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
} as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUS)[keyof typeof ONBOARDING_STATUS];

export const IMPORT_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  PARTIAL: "partial",
} as const;
export type ImportStatus = (typeof IMPORT_STATUS)[keyof typeof IMPORT_STATUS];

export const MODERATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  FLAGGED: "flagged",
} as const;
export type ModerationStatus = (typeof MODERATION_STATUS)[keyof typeof MODERATION_STATUS];

export const AVAILABILITY_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  BOOKED: "booked",
  BLOCKED: "blocked",
  MAINTENANCE: "maintenance",
} as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];

export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PAID: "paid",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const SUPPORT_TICKET_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  WAITING_CUSTOMER: "waiting_customer",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUS)[keyof typeof SUPPORT_TICKET_STATUS];

export const ENGINE_STATUS = {
  REGISTERED: "registered",
  ACTIVE: "active",
  PAUSED: "paused",
  CRASHED: "crashed",
  DISABLED: "disabled",
} as const;
export type EngineStatus = (typeof ENGINE_STATUS)[keyof typeof ENGINE_STATUS];

export const CONSENT_STATUS = {
  GRANTED: "granted",
  DENIED: "denied",
  REVOKED: "revoked",
  EXPIRED: "expired",
} as const;
export type ConsentStatus = (typeof CONSENT_STATUS)[keyof typeof CONSENT_STATUS];

export const LEDGER_DIRECTION = {
  CREDIT: "credit",
  DEBIT: "debit",
} as const;
export type LedgerDirection = (typeof LEDGER_DIRECTION)[keyof typeof LEDGER_DIRECTION];
