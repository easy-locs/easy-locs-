/**
 * domain.ts — LEGACY type barrel. Types are progressively migrating
 * to @/domains/shared/canonical-types.ts (SSOT).
 *
 * New code should import from canonical-types.ts directly.
 * This file re-exports canonical types for backward compatibility.
 */

// ── Re-export canonical types as primary source ──
export type {
  AppRole,
  CurrencyCode,
  PermissionStateValue,
  DevicePermissions,
  ServiceLinks,
  CanonicalOrbitProfile,
  CanonicalUserProfile,
  CanonicalWalletState,
  CanonicalWalletTransaction,
  CanonicalGeoPosition,
  CanonicalAddress,
  CanonicalRadarEntity,
  CanonicalBooking,
  BookingStatus as CanonicalBookingStatus,
  CanonicalMessage,
  MessageType as CanonicalMessageType,
  CanonicalDashboardSummary,
  DashboardActivityItem,
  PaymentStatus,
  OrderStatus,
  DriverStatus,
  CommunicationContextType,
  CommunicationContext,
  IdempotencyHeader,
} from "@/domains/shared/canonical-types";

// ── Legacy aliases (backward compat — DO NOT USE in new code) ──

import type { CanonicalOrbitProfile, CanonicalWalletState, CanonicalWalletTransaction, CanonicalGeoPosition, CurrencyCode, AppRole } from "@/domains/shared/canonical-types";

/** @deprecated Use CanonicalOrbitProfile */
export type OrbitProfile = {
  userId: string;
  orbitId: string;
  role: AppRole;
  deviceId: string;
  verificationLevel: number;
  permissions: {
    camera: boolean;
    microphone: boolean;
    geolocation: boolean;
    contacts: boolean;
    notifications: boolean;
  };
  serviceLinks: {
    walletLinked: boolean;
    bookingEnabled: boolean;
    deliveryEnabled: boolean;
    propertyEnabled: boolean;
    messagingEnabled: boolean;
  };
};

/** @deprecated Use CanonicalWalletState */
export type WalletStateModel = {
  walletId: string;
  ownerOrbitId: string;
  currency: CurrencyCode;
  availableBalance: number;
  lockedBalance: number;
  pendingBalance: number;
  lastUpdatedAt: string | null;
};

/** @deprecated Use CanonicalWalletTransaction */
export type WalletTransaction = {
  id: string;
  type: "payment" | "refund" | "topup" | "withdrawal" | "escrow_lock" | "escrow_release" | "payout";
  status: "pending" | "success" | "failed" | "cancelled";
  amount: number;
  currency: CurrencyCode;
  reference?: string;
  createdAt: string;
};

/** @deprecated Use CanonicalGeoPosition */
export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string | null;
};

export type ServiceMode =
  | "direct_booking"
  | "inquiry"
  | "instant_pay"
  | "delivery"
  | "pickup"
  | "chat_only";

export type ListingStatus = "draft" | "published" | "paused" | "archived";

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "refunded";

export type BookingFlowMode = "instant_book" | "request_to_book";

// Re-export canonical communication types from comms.ts — SINGLE SOURCE OF TRUTH
export type {
  ConversationType,
  MessageType,
  CallType,
  CallStatus,
  CallDirection,
  ConversationParticipant,
  ConversationRecord,
  ChatMessageRecord,
  ConversationRow,
  ChatMessageRow,
} from "@/lib/types/comms";

export type LeaseStatus = "draft" | "active" | "late" | "terminated" | "completed";

export type RentPaymentStatus =
  | "pending"
  | "paid"
  | "late"
  | "partial"
  | "cancelled";

export interface ListingAvailabilityRange {
  startDate: string;
  endDate: string;
  available: boolean;
  reason?: string;
}

export interface ListingMediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  cover?: boolean;
}

export interface PropertyServiceConfig {
  chatEnabled: boolean;
  callEnabled: boolean;
  directBookingEnabled: boolean;
  qrPaymentEnabled: boolean;
  orbitEscrowEnabled: boolean;
  propertyManagementEnabled: boolean;
}

export interface PropertyListingV2 {
  id: string;
  ownerOrbitId: string;
  status: ListingStatus;
  title: string;
  description?: string;
  category: "property";
  serviceModes: ServiceMode[];
  flowMode: BookingFlowMode;
  location: {
    lat: number;
    lng: number;
    address: string;
    city?: string;
    country?: string;
  };
  pricing: {
    currency: CurrencyCode;
    nightPrice: number;
    cleaningFee?: number;
    serviceFee?: number;
    securityDeposit?: number;
    monthlyRent?: number;
  };
  capacity?: {
    guests?: number;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
  };
  media: ListingMediaItem[];
  tags: string[];
  walletLinked: boolean;
  bookingEnabled: boolean;
  orbitLinked: boolean;
  serviceConfig: PropertyServiceConfig;
  availability: ListingAvailabilityRange[];
  createdAt: string;
  updatedAt: string;
}

export interface BookingGuestInfo {
  fullName?: string;
  phone?: string;
  notes?: string;
  guestsCount?: number;
}

export interface BookingRecordV2 {
  id: string;
  listingId: string;
  buyerOrbitId: string;
  ownerOrbitId: string;
  status: BookingStatus;
  flowMode: BookingFlowMode;
  amount: number;
  currency: CurrencyCode;
  pricingBreakdown: {
    nights: number;
    nightPrice: number;
    subtotal: number;
    cleaningFee: number;
    serviceFee: number;
    securityDeposit: number;
    total: number;
  };
  checkIn: string;
  checkOut: string;
  guestInfo?: BookingGuestInfo;
  transactionId?: string;
  escrowTransactionId?: string;
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyUnitManagement {
  id: string;
  listingId: string;
  ownerOrbitId: string;
  walletId: string;
  orbitLinked: boolean;
  walletLinked: boolean;
  unitLabel: string;
  propertyType: "apartment" | "villa" | "studio" | "room" | "shop" | "office";
  address: string;
  monthlyRent: number;
  currency: CurrencyCode;
  securityDeposit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseRecord {
  id: string;
  listingId: string;
  unitId: string;
  ownerOrbitId: string;
  tenantOrbitId: string;
  walletId: string;
  rentAmount: number;
  currency: CurrencyCode;
  depositAmount?: number;
  startDate: string;
  endDate: string;
  dueDay: number;
  status: LeaseStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentPaymentRecord {
  id: string;
  leaseId: string;
  listingId: string;
  ownerOrbitId: string;
  tenantOrbitId: string;
  walletId: string;
  amount: number;
  currency: CurrencyCode;
  dueDate: string;
  paidAt?: string;
  status: RentPaymentStatus;
  transactionId?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}
