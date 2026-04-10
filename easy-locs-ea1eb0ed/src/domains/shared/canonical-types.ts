/**
 * CANONICAL DOMAIN TYPES — Single Source of Truth.
 *
 * Every domain imports its foundational types from here.
 * NO parallel definitions allowed anywhere else.
 *
 * Rule: If a type represents a domain entity, it lives here.
 * Domain-specific extensions live in their own domain folder
 * but must extend or compose these base types.
 */

// ══════════════════════════════════════════════════
// IDENTITY
// ══════════════════════════════════════════════════

export type AppRole =
  | "guest"
  | "buyer"
  | "seller"
  | "driver"
  | "owner"
  | "tenant"
  | "admin";

export type PermissionStateValue = "prompt" | "granted" | "denied";

export interface DevicePermissions {
  camera: boolean;
  microphone: boolean;
  geolocation: boolean;
  contacts: boolean;
  notifications: boolean;
}

export interface ServiceLinks {
  walletLinked: boolean;
  bookingEnabled: boolean;
  deliveryEnabled: boolean;
  propertyEnabled: boolean;
  messagingEnabled: boolean;
}

/**
 * CANONICAL OrbitProfile — THE ONLY valid type for Orbit identity.
 * Replaces: OrbitProfileV2 (orbitStore), OrbitProfile (domain.ts, auth.ts, ports.ts)
 */
export interface CanonicalOrbitProfile {
  id: string;            // auth user id
  orbitId: string;       // orbit_id from orbit_profiles_v2
  email: string | null;
  role: AppRole;
  displayName: string | null;
  avatarUrl: string | null;
  deviceId: string | null;
  verificationLevel: number;
  permissions: DevicePermissions;
  serviceLinks: ServiceLinks;
}

/**
 * CANONICAL UserProfile — Me domain identity.
 */
export interface CanonicalUserProfile {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string | null;
  country: string;
  city: string;
  dateOfBirth: string | null;
  nationality: string | null;
}

// ══════════════════════════════════════════════════
// CURRENCY & FINANCE
// ══════════════════════════════════════════════════

export type CurrencyCode =
  | "AED" | "USD" | "EUR" | "SAR" | "GBP"
  | "INR" | "MAD" | "EGP" | "TND" | "XOF" | "XAF" | "TRY";

/**
 * CANONICAL WalletState — THE ONLY valid wallet balance model.
 * Replaces: WalletStateModel (domain.ts), WalletAccount (wallet/ports.ts), WalletBalance (wallet-balance-fetcher.ts)
 */
export interface CanonicalWalletState {
  walletId: string;
  ownerUserId: string;
  currency: CurrencyCode;
  availableBalance: number;
  escrowBalance: number;
  pendingBalance: number;
  status: "active" | "frozen" | "closed";
  lastUpdatedAt: string | null;
}

/**
 * CANONICAL WalletTransaction — THE ONLY valid transaction model.
 * Replaces: WalletTransaction (domain.ts), UnifiedTx (wallet-hooks.ts)
 */
export interface CanonicalWalletTransaction {
  id: string;
  type: "payment" | "refund" | "topup" | "withdrawal" | "escrow_lock" | "escrow_release" | "payout" | "transfer";
  status: "pending" | "success" | "failed" | "cancelled";
  amount: number;
  currency: CurrencyCode;
  senderId: string | null;
  recipientId: string | null;
  contextType: string | null;
  contextId: string | null;
  reference: string | null;
  title: string | null;
  subtitle: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// GEO / RADAR
// ══════════════════════════════════════════════════

export interface CanonicalGeoPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string | null;
}

export interface CanonicalAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  countryCode: string;
  position: CanonicalGeoPosition | null;
  formattedAddress: string | null;
  placeId: string | null;
}

export interface CanonicalRadarEntity {
  id: string;
  type: string;
  position: CanonicalGeoPosition;
  label: string;
  category: string;
  metadata: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// BOOKING
// ══════════════════════════════════════════════════

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "refunded";

export interface CanonicalBooking {
  id: string;
  userId: string;
  providerId: string;
  providerName: string;
  type: "food" | "hotel" | "service" | "property" | "event";
  status: BookingStatus;
  scheduledAt: string;
  duration: number | null;
  amount: number;
  currency: CurrencyCode;
  paymentStatus: PaymentStatus;
  transactionId: string | null;
  address: CanonicalAddress | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════
// MESSAGE
// ══════════════════════════════════════════════════

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "location"
  | "payment_request"
  | "payment_sent"
  | "payment_receipt"
  | "booking_card"
  | "system";

export interface CanonicalMessage {
  id: string;
  threadId: string;
  senderUserId: string;
  type: MessageType;
  body: string | null;
  mediaUrl: string | null;
  replyToId: string | null;
  context: CommunicationContext | null;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════

export interface CanonicalDashboardSummary {
  unreadMessages: number;
  activeConversations: number;
  walletBalance: number;
  walletCurrency: CurrencyCode;
  pendingBookings: number;
  activeListings: number;
  recentActivity: DashboardActivityItem[];
}

export interface DashboardActivityItem {
  id: string;
  type: "message" | "payment" | "booking" | "listing" | "call" | "system";
  title: string;
  subtitle: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// STATE MACHINE STATUSES (closed enums)
// ══════════════════════════════════════════════════

export type PaymentStatus =
  | "created"
  | "pending_confirmation"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "cancelled";

export type OrderStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "preparing"
  | "ready"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "failed";

export type DriverStatus =
  | "available"
  | "reserved"
  | "assigned"
  | "on_route_to_pickup"
  | "waiting_pickup"
  | "on_delivery"
  | "completed"
  | "offline";

export type { FlightStatus } from "@/domains/flight/flight-types";

// ══════════════════════════════════════════════════
// COMMUNICATION CONTEXT
// ══════════════════════════════════════════════════

export type CommunicationContextType =
  | "order"
  | "payment"
  | "driver_delivery"
  | "support_case"
  | "property_ticket"
  | "lease"
  | "maintenance"
  | "booking"
  | "marketplace_listing"
  | "direct"
  | "group";

export interface CommunicationContext {
  type: CommunicationContextType;
  entityId: string;
  entityLabel?: string;
  metadata?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// IDEMPOTENCY
// ══════════════════════════════════════════════════

export interface IdempotencyHeader {
  requestId: string;
  correlationId?: string;
  version?: number;
  retryCount?: number;
  lastError?: string;
}
