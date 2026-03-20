export const Z = {
  base: 1,
  header: 10,
  bottomNav: 20,
  sidePanel: 30,
  overlay: 40,
  map: 50,
  callScreen: 60,
  cameraFullscreen: 70,
  emergencyModal: 80,
} as const;

export type ZKey = keyof typeof Z;

export type AppRole =
  | "guest"
  | "buyer"
  | "seller"
  | "driver"
  | "owner"
  | "tenant"
  | "admin";

export type PermissionStateValue = "prompt" | "granted" | "denied";

export type CurrencyCode =
  | "AED"
  | "USD"
  | "EUR"
  | "SAR"
  | "GBP";

export type ServiceMode =
  | "direct_booking"
  | "inquiry"
  | "instant_pay"
  | "delivery"
  | "pickup"
  | "chat_only";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoPosition extends LatLng {
  accuracy: number | null;
  updatedAt: string | null;
}

export interface OrbitProfile {
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
}

export interface WalletStateModel {
  walletId: string;
  ownerOrbitId: string;
  currency: CurrencyCode;
  availableBalance: number;
  lockedBalance: number;
  pendingBalance: number;
  lastUpdatedAt: string | null;
}

export interface WalletTransaction {
  id: string;
  type:
    | "payment"
    | "refund"
    | "topup"
    | "withdrawal"
    | "escrow_lock"
    | "escrow_release"
    | "payout";
  status: "pending" | "success" | "failed" | "cancelled";
  amount: number;
  currency: CurrencyCode;
  reference?: string;
  createdAt: string;
}

export interface PropertyListing {
  id: string;
  ownerOrbitId: string;
  title: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  pricing: {
    currency: CurrencyCode;
    nightPrice: number;
    cleaningFee?: number;
  };
  bookingEnabled: boolean;
  walletLinked: boolean;
  serviceModes: ServiceMode[];
}

export interface BookingRecord {
  id: string;
  listingId: string;
  buyerOrbitId: string;
  ownerOrbitId: string;
  status:
    | "draft"
    | "pending_payment"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "refunded";
  amount: number;
  currency: CurrencyCode;
  checkIn?: string;
  checkOut?: string;
  transactionId?: string;
  createdAt: string;
}
