import type {
  CurrencyCode,
  ServiceMode,
} from "@/lib/types/app";

export type ListingStatus =
  | "draft"
  | "published"
  | "paused"
  | "archived";

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "refunded";

export type BookingFlowMode =
  | "instant_book"
  | "request_to_book";

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
