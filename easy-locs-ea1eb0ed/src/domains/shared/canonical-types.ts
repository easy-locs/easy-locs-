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
// ORDER
// ══════════════════════════════════════════════════

export interface CanonicalOrder {
  id: string;
  userId: string;
  providerId: string;
  providerName: string;
  type: "food" | "grocery" | "pharmacy" | "parcel" | "errand";
  status: OrderStatus;
  items: CanonicalOrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  currency: CurrencyCode;
  paymentStatus: PaymentStatus;
  transactionId: string | null;
  deliveryJobId: string | null;
  pickupAddress: CanonicalAddress | null;
  deliveryAddress: CanonicalAddress | null;
  notes: string | null;
  estimatedDeliveryAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  options: Record<string, string>;
  metadata: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// DELIVERY JOB
// ══════════════════════════════════════════════════

export type DeliveryJobStatus =
  | "pending"
  | "assigned"
  | "pickup_en_route"
  | "at_pickup"
  | "picked_up"
  | "delivery_en_route"
  | "at_delivery"
  | "delivered"
  | "failed"
  | "cancelled";

export interface CanonicalDeliveryJob {
  id: string;
  orderId: string;
  driverId: string | null;
  status: DeliveryJobStatus;
  pickupAddress: CanonicalAddress;
  deliveryAddress: CanonicalAddress;
  pickupPosition: CanonicalGeoPosition | null;
  deliveryPosition: CanonicalGeoPosition | null;
  currentPosition: CanonicalGeoPosition | null;
  estimatedPickupAt: string | null;
  estimatedDeliveryAt: string | null;
  actualPickupAt: string | null;
  actualDeliveryAt: string | null;
  distanceKm: number | null;
  fee: number;
  currency: CurrencyCode;
  proofOfDelivery: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════
// RIDE REQUEST
// ══════════════════════════════════════════════════

export type RideStatus =
  | "requesting"
  | "matching"
  | "driver_assigned"
  | "driver_en_route"
  | "arrived"
  | "in_ride"
  | "completed"
  | "cancelled"
  | "no_driver";

export interface CanonicalRideRequest {
  id: string;
  passengerId: string;
  driverId: string | null;
  status: RideStatus;
  vehicleType: "economy" | "comfort" | "premium" | "xl" | "moto" | "van" | "luxury";
  pickupAddress: CanonicalAddress;
  dropoffAddress: CanonicalAddress;
  pickupPosition: CanonicalGeoPosition;
  dropoffPosition: CanonicalGeoPosition;
  currentPosition: CanonicalGeoPosition | null;
  estimatedFare: number;
  finalFare: number | null;
  currency: CurrencyCode;
  surgeMultiplier: number;
  distanceKm: number;
  durationMinutes: number;
  etaMinutes: number | null;
  paymentMethod: "wallet" | "card" | "cash";
  transactionId: string | null;
  rating: number | null;
  metadata: Record<string, unknown>;
  requestedAt: string;
  completedAt: string | null;
}

// ══════════════════════════════════════════════════
// LISTING
// ══════════════════════════════════════════════════

export type ListingStatus = "draft" | "active" | "paused" | "sold" | "expired" | "removed";

export interface CanonicalListing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  vertical: CanonicalVertical;
  status: ListingStatus;
  price: number;
  currency: CurrencyCode;
  priceType: "fixed" | "hourly" | "daily" | "monthly" | "negotiable";
  images: string[];
  address: CanonicalAddress | null;
  position: CanonicalGeoPosition | null;
  rating: number | null;
  reviewCount: number;
  tags: string[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════
// PROVIDER PROFILE
// ══════════════════════════════════════════════════

export type ProviderType = "restaurant" | "hotel" | "service" | "shop" | "driver" | "landlord" | "freelancer";
export type ProviderStatus = "pending" | "verified" | "active" | "suspended" | "inactive";

export interface CanonicalProviderProfile {
  id: string;
  userId: string;
  type: ProviderType;
  status: ProviderStatus;
  businessName: string;
  description: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  address: CanonicalAddress | null;
  position: CanonicalGeoPosition | null;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  walletId: string | null;
  commissionRate: number;
  tags: string[];
  operatingHours: Record<string, { open: string; close: string }>;
  metadata: Record<string, unknown>;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════
// NOTIFICATION
// ══════════════════════════════════════════════════

export type NotificationChannel = "push" | "in_app" | "sms" | "email";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface CanonicalNotification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  iconUrl: string | null;
  actionUrl: string | null;
  actionType: string | null;
  context: CommunicationContext | null;
  read: boolean;
  dismissed: boolean;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// SUPPORT TICKET
// ══════════════════════════════════════════════════

export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "waiting_agent" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface CanonicalSupportTicket {
  id: string;
  userId: string;
  assigneeId: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  context: CommunicationContext | null;
  threadId: string | null;
  attachments: string[];
  resolution: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

// ══════════════════════════════════════════════════
// PRESENCE / AVAILABILITY
// ══════════════════════════════════════════════════

export type PresenceStatus = "online" | "away" | "busy" | "offline";

export interface CanonicalPresence {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string;
  currentPosition: CanonicalGeoPosition | null;
  activeModule: string | null;
  deviceType: "mobile" | "desktop" | "tablet" | null;
  metadata: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// MEDIA ASSET
// ══════════════════════════════════════════════════

export type MediaAssetType = "image" | "video" | "audio" | "document" | "archive";

export interface CanonicalMediaAsset {
  id: string;
  ownerId: string;
  type: MediaAssetType;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  contextType: string | null;
  contextId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// PAYMENT INTENT
// ══════════════════════════════════════════════════

export interface CanonicalPaymentIntent {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  method: "wallet" | "card" | "apple_pay" | "google_pay" | "qr" | "link" | "cash";
  contextType: "order" | "booking" | "subscription" | "transfer" | "invoice" | "ride" | "delivery";
  contextId: string;
  escrowRequired: boolean;
  escrowId: string | null;
  fees: CanonicalFeeBreakdown;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalFeeBreakdown {
  platformFee: number;
  paymentProcessingFee: number;
  commission: number;
  tax: number;
  total: number;
  currency: CurrencyCode;
}

// ══════════════════════════════════════════════════
// PAYOUT
// ══════════════════════════════════════════════════

export type PayoutStatus = "pending" | "processing" | "completed" | "failed" | "reversed";

export interface CanonicalPayout {
  id: string;
  providerId: string;
  amount: number;
  currency: CurrencyCode;
  status: PayoutStatus;
  method: "wallet" | "bank_transfer" | "mobile_money";
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossAmount: number;
  commissionDeducted: number;
  feesDeducted: number;
  netAmount: number;
  reference: string | null;
  metadata: Record<string, unknown>;
  processedAt: string | null;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// LEDGER ENTRY (DOUBLE-ENTRY)
// ══════════════════════════════════════════════════

export type LedgerEntryType = "debit" | "credit";

export interface CanonicalLedgerEntry {
  id: string;
  transactionId: string;
  walletId: string;
  type: LedgerEntryType;
  amount: number;
  currency: CurrencyCode;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  counterpartyWalletId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// EXCHANGE RATE
// ══════════════════════════════════════════════════

export interface CanonicalExchangeRate {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  inverseRate: number;
  spread: number;
  source: "internal" | "external" | "fixed";
  validFrom: string;
  validTo: string | null;
  updatedAt: string;
}

// ══════════════════════════════════════════════════
// APP SESSION STATE
// ══════════════════════════════════════════════════

export interface CanonicalAppSession {
  sessionId: string;
  userId: string;
  startedAt: string;
  lastActivityAt: string;
  activeModule: string | null;
  activePillar: string | null;
  deviceId: string | null;
  deviceType: "mobile" | "desktop" | "tablet";
  appVersion: string;
  locale: string;
  country: string;
  currency: CurrencyCode;
  permissions: DevicePermissions;
  featureFlags: Record<string, boolean>;
  metadata: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// ESCROW
// ══════════════════════════════════════════════════

export type EscrowStatus = "locked" | "partially_released" | "released" | "disputed" | "refunded";

export interface CanonicalEscrow {
  id: string;
  paymentIntentId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: CurrencyCode;
  status: EscrowStatus;
  lockedAt: string;
  releaseCondition: string;
  releasedAt: string | null;
  disputeReason: string | null;
  metadata: Record<string, unknown>;
}

// ══════════════════════════════════════════════════
// REFUND
// ══════════════════════════════════════════════════

export type RefundStatus = "requested" | "approved" | "processing" | "completed" | "rejected";

export interface CanonicalRefund {
  id: string;
  transactionId: string;
  paymentIntentId: string;
  requesterId: string;
  amount: number;
  currency: CurrencyCode;
  status: RefundStatus;
  reason: string;
  type: "full" | "partial";
  approvedBy: string | null;
  metadata: Record<string, unknown>;
  requestedAt: string;
  processedAt: string | null;
}

// ══════════════════════════════════════════════════
// COMMISSION
// ══════════════════════════════════════════════════

export interface CanonicalCommission {
  id: string;
  transactionId: string;
  providerId: string;
  module: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: CurrencyCode;
  country: string;
  tier: "standard" | "premium" | "enterprise";
  metadata: Record<string, unknown>;
  createdAt: string;
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

// ══════════════════════════════════════════════════
// CANONICAL VERTICAL — Closed set of verticals
// ══════════════════════════════════════════════════

export type CanonicalVertical =
  | "food"
  | "grocery"
  | "hotel"
  | "service"
  | "services"
  | "property"
  | "flight"
  | "ride"
  | "delivery"
  | "retail"
  | "shops"
  | "healthcare"
  | "events"
  | "experiences"
  | "education"
  | "beauty"
  | "mobility"
  | "stay"
  | "utility"
  | "finance";

// ══════════════════════════════════════════════════
// PER-VERTICAL CANONICAL ENTITIES — Phase 1
// ══════════════════════════════════════════════════

export interface CanonicalFoodEntity {
  id: string;
  vertical: "food";
  providerId: string;
  providerName: string;
  category: string;
  subcategory: string;
  menuItems: CanonicalMenuItem[];
  cuisineType: string[];
  dietaryTags: string[];
  prepTimeMinutes: number | null;
  minimumOrder: number | null;
  deliveryFee: number;
  currency: CurrencyCode;
  rating: number | null;
  reviewCount: number;
  isOpen: boolean;
  operatingHours: Record<string, { open: string; close: string }>;
  address: CanonicalAddress;
  position: CanonicalGeoPosition | null;
  images: string[];
  halal: boolean;
  kosher: boolean;
  metadata: Record<string, unknown>;
}

export interface CanonicalMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: CurrencyCode;
  category: string;
  imageUrl: string | null;
  available: boolean;
  modifiers: CanonicalMenuModifier[];
  dietaryTags: string[];
  prepTimeMinutes: number | null;
}

export interface CanonicalMenuModifier {
  id: string;
  name: string;
  options: { label: string; price: number }[];
  required: boolean;
  maxSelections: number;
}

export interface CanonicalHotelEntity {
  id: string;
  vertical: "hotel";
  providerId: string;
  providerName: string;
  category: string;
  subcategory: string;
  starRating: number;
  roomTypes: CanonicalRoomType[];
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  currency: CurrencyCode;
  pricePerNightFrom: number;
  rating: number | null;
  reviewCount: number;
  address: CanonicalAddress;
  position: CanonicalGeoPosition | null;
  images: string[];
  metadata: Record<string, unknown>;
}

export interface CanonicalRoomType {
  id: string;
  name: string;
  description: string | null;
  maxGuests: number;
  bedType: string;
  pricePerNight: number;
  currency: CurrencyCode;
  available: boolean;
  amenities: string[];
  images: string[];
}

export interface CanonicalServiceEntity {
  id: string;
  vertical: "service";
  providerId: string;
  providerName: string;
  category: string;
  subcategory: string;
  serviceType: string;
  packages: CanonicalServicePackage[];
  qualifications: string[];
  yearsExperience: number | null;
  currency: CurrencyCode;
  priceFrom: number;
  pricingModel: "fixed" | "hourly" | "project" | "custom";
  rating: number | null;
  reviewCount: number;
  availableSlots: boolean;
  serviceArea: string[];
  address: CanonicalAddress | null;
  position: CanonicalGeoPosition | null;
  images: string[];
  metadata: Record<string, unknown>;
}

export interface CanonicalServicePackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: CurrencyCode;
  durationMinutes: number;
  includes: string[];
}

export interface CanonicalPropertyEntity {
  id: string;
  vertical: "property";
  ownerId: string;
  title: string;
  description: string;
  propertyType: "apartment" | "house" | "villa" | "studio" | "office" | "land" | "commercial" | "warehouse";
  listingType: "rent" | "sale" | "seasonal";
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  floor: number | null;
  totalFloors: number | null;
  furnished: boolean;
  amenities: string[];
  price: number;
  currency: CurrencyCode;
  priceType: "monthly" | "yearly" | "total" | "daily";
  availableFrom: string | null;
  address: CanonicalAddress;
  position: CanonicalGeoPosition | null;
  images: string[];
  virtualTourUrl: string | null;
  status: ListingStatus;
  metadata: Record<string, unknown>;
}

export interface CanonicalFlightEntity {
  id: string;
  vertical: "flight";
  airline: string;
  flightNumber: string;
  origin: CanonicalAirport;
  destination: CanonicalAirport;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  price: number;
  currency: CurrencyCode;
  seatsAvailable: number;
  baggageIncluded: boolean;
  refundable: boolean;
  operatedBy: string | null;
  metadata: Record<string, unknown>;
}

export interface CanonicalAirport {
  code: string;
  name: string;
  city: string;
  country: string;
  position: CanonicalGeoPosition | null;
}

export interface CanonicalRideEntity {
  id: string;
  vertical: "ride";
  driverId: string;
  driverName: string;
  vehicleType: "economy" | "comfort" | "premium" | "xl" | "moto" | "van" | "luxury";
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  vehicleColor: string | null;
  rating: number | null;
  totalTrips: number;
  position: CanonicalGeoPosition | null;
  available: boolean;
  currency: CurrencyCode;
  metadata: Record<string, unknown>;
}

export interface CanonicalDeliveryEntity {
  id: string;
  vertical: "delivery";
  courierId: string | null;
  courierName: string | null;
  packageType: "small" | "medium" | "large" | "fragile" | "food" | "document";
  pickupAddress: CanonicalAddress;
  deliveryAddress: CanonicalAddress;
  weight: number | null;
  dimensions: { l: number; w: number; h: number } | null;
  estimatedPrice: number;
  currency: CurrencyCode;
  priority: "standard" | "express" | "same_day" | "scheduled";
  scheduledPickupAt: string | null;
  specialInstructions: string | null;
  requiresSignature: boolean;
  metadata: Record<string, unknown>;
}

export interface CanonicalMerchantEntity {
  id: string;
  userId: string;
  vertical: CanonicalVertical;
  businessName: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  type: ProviderType;
  status: ProviderStatus;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: CanonicalAddress;
  position: CanonicalGeoPosition | null;
  rating: number;
  reviewCount: number;
  completedOrders: number;
  walletId: string | null;
  commissionRate: number;
  verified: boolean;
  operatingHours: Record<string, { open: string; close: string }>;
  tags: string[];
  images: string[];
  currency: CurrencyCode;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// CANONICAL MEDIA — Phase 1 (replaces generic media)
// ══════════════════════════════════════════════════

export type MediaValidationStatus = "pending" | "approved" | "quarantined" | "rejected";

export interface CanonicalMediaEntity {
  id: string;
  ownerId: string;
  type: MediaAssetType;
  url: string;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  vertical: CanonicalVertical | null;
  category: string | null;
  subcategory: string | null;
  contextType: string | null;
  contextId: string | null;
  validationStatus: MediaValidationStatus;
  relevanceScore: number | null;
  conflictReason: string | null;
  displayAllowed: boolean;
  countryCode: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ══════════════════════════════════════════════════
// CANONICAL BANNER — Phase 1
// ══════════════════════════════════════════════════

export type BannerType = "hero" | "inline" | "card" | "micro" | "fullscreen" | "interstitial";
export type BannerPriority = "low" | "medium" | "high" | "critical";

export interface CanonicalBannerEntity {
  id: string;
  type: BannerType;
  priority: BannerPriority;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaAction: string | null;
  vertical: CanonicalVertical | null;
  category: string | null;
  audienceDefinition: BannerAudience;
  triggerConditions: BannerTrigger;
  exclusionConditions: string[];
  validFrom: string;
  validTo: string | null;
  localeVariants: Record<string, { title: string; subtitle: string | null; imageUrl: string }>;
  approvedVisualPool: string[];
  approvedCopyPool: string[];
  ctaPolicy: string | null;
  fallbackPolicy: string | null;
  performanceTracking: { impressions: number; clicks: number; conversions: number };
  metadata: Record<string, unknown>;
}

export interface BannerAudience {
  countries: string[];
  cities: string[];
  locales: string[];
  verticals: CanonicalVertical[];
  userTypes: AppRole[];
  segments: string[];
}

export interface BannerTrigger {
  timeOfDay: string[];
  daysOfWeek: number[];
  seasons: string[];
  events: string[];
  religions: string[];
  cuisines: string[];
  weatherContexts: string[];
  campaignIds: string[];
}

// ══════════════════════════════════════════════════
// CANONICAL CATEGORY NODE — Phase 1
// ══════════════════════════════════════════════════

export interface CanonicalCategoryNode {
  vertical: CanonicalVertical;
  category: string;
  subcategory: string | null;
  allowedMediaTypes: MediaAssetType[];
  allowedCardTemplates: string[];
  allowedCTAFamilies: string[];
  allowedSearchFacets: string[];
  allowedBannerContexts: string[];
  allowedLocaleVariants: string[];
}

// ══════════════════════════════════════════════════
// CANONICAL CONTEXT — Country, Locale, Currency
// ══════════════════════════════════════════════════

export interface CanonicalCountryContext {
  countryCode: string;
  countryName: string;
  defaultLocale: string;
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  supportedLocales: string[];
  timezone: string;
  writingDirection: "ltr" | "rtl";
  unitSystem: "metric" | "imperial";
  calendarType: "gregorian" | "hijri" | "both";
  legalDisclosures: string[];
  culturalFlags: string[];
}

export interface CanonicalLocaleContext {
  locale: string;
  language: string;
  region: string;
  writingDirection: "ltr" | "rtl";
  numberFormat: string;
  dateFormat: string;
  currencyFormat: string;
  culturalWording: Record<string, string>;
  seasonalTiming: Record<string, string>;
  promoTone: string;
}

export interface CanonicalCurrencyContext {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimalPlaces: number;
  thousandSeparator: string;
  decimalSeparator: string;
  symbolPosition: "before" | "after";
  minimumAmount: number;
  maximumAmount: number;
}

// ══════════════════════════════════════════════════
// CANONICAL DESCRIPTORS — Action, Page, Flow
// ══════════════════════════════════════════════════

export type ActionResultType = "navigation" | "mutation" | "modal" | "toast" | "external" | "download" | "share";

export interface CanonicalActionDescriptor {
  actionId: string;
  ownerDomain: string;
  ownerVertical: CanonicalVertical | "platform";
  label: string;
  targetFlow: string;
  targetRoute: string | null;
  resultType: ActionResultType;
  successState: string;
  failureState: string;
  analyticsEvent: string;
  auditLog: boolean;
  permissionRule: string | null;
  fallbackRule: string | null;
  requiresAuth: boolean;
  metadata: Record<string, unknown>;
}

export type PageFamily =
  | "list"
  | "detail"
  | "dashboard"
  | "composer"
  | "checkout"
  | "chat"
  | "settings"
  | "admin"
  | "auth"
  | "onboarding"
  | "search"
  | "map";

export interface CanonicalPageDescriptor {
  pageId: string;
  route: string;
  ownerDomain: string;
  ownerVertical: CanonicalVertical | "platform";
  pageFamily: PageFamily;
  requiredData: string[];
  allowedCards: string[];
  allowedActions: string[];
  allowedBanners: BannerType[];
  failureBehaviors: PageFailureBehavior[];
  seoMeta: { title: string; description: string; canonical: string } | null;
}

export interface PageFailureBehavior {
  condition: "no_data" | "auth_required" | "not_found" | "server_error" | "network_error";
  action: "redirect" | "show_error" | "show_empty" | "retry" | "fallback";
  target: string | null;
}

export type FlowState =
  | "idle"
  | "validating"
  | "loading"
  | "processing"
  | "success"
  | "failed"
  | "retrying"
  | "blocked"
  | "cancelled";

export interface CanonicalFlowDescriptor {
  flowId: string;
  ownerDomain: string;
  ownerVertical: CanonicalVertical | "platform";
  startTrigger: string;
  states: FlowState[];
  currentState: FlowState;
  successCriteria: string;
  failureCriteria: string;
  retryPolicy: { maxRetries: number; backoffMs: number; retryOn: string[] };
  analyticsMapping: Record<string, string>;
  auditMapping: Record<string, string>;
  requiredPermissions: string[];
  timeout: number;
}

// ══════════════════════════════════════════════════
// VERTICAL TYPE MAP — Union discriminator
// ══════════════════════════════════════════════════

export type CanonicalVerticalEntity =
  | CanonicalFoodEntity
  | CanonicalHotelEntity
  | CanonicalServiceEntity
  | CanonicalPropertyEntity
  | CanonicalFlightEntity
  | CanonicalRideEntity
  | CanonicalDeliveryEntity;

export function isVerticalEntity<V extends CanonicalVertical>(
  entity: CanonicalVerticalEntity,
  vertical: V
): entity is Extract<CanonicalVerticalEntity, { vertical: V }> {
  return entity.vertical === vertical;
}

// ══════════════════════════════════════════════════
// GOVERNANCE VALIDATION — Phase 1
// ══════════════════════════════════════════════════

export type GovernanceViolationType =
  | "cross_vertical_contamination"
  | "invalid_media"
  | "invalid_category"
  | "missing_canonical_field"
  | "dead_action"
  | "unclosed_flow"
  | "layout_overflow"
  | "text_integrity"
  | "banner_conflict"
  | "localization_mismatch";

export type GovernanceSeverity = "info" | "warning" | "error" | "critical";

export interface GovernanceViolation {
  id: string;
  type: GovernanceViolationType;
  severity: GovernanceSeverity;
  source: string;
  target: string;
  message: string;
  ownerDomain: string;
  vertical: CanonicalVertical | "platform";
  detectedAt: string;
  resolvedAt: string | null;
  autoRemediated: boolean;
  metadata: Record<string, unknown>;
}
