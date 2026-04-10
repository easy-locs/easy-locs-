export type FlightStatus =
  | "searching"
  | "priced"
  | "selected"
  | "booking_pending"
  | "payment_pending"
  | "payment_confirmed"
  | "ticketing_in_progress"
  | "ticketed"
  | "failed"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export type TripType = "one_way" | "round_trip" | "multi_city";
export type PassengerType = "adult" | "child" | "infant";
export type PaymentMode = "platform" | "provider_direct" | "hybrid";
export type TicketStatus = "pending" | "issued" | "void" | "refunded" | "exchanged";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  cabinClass: CabinClass;
  passengers: PassengerCount;
  currency: string;
  locale?: string;
  directOnly?: boolean;
  maxStops?: number;
  preferredAirlines?: string[];
  flexDates?: boolean;
}

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightSegment {
  segmentId: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  aircraft?: string;
  origin: string;
  originCity: string;
  originAirport: string;
  destination: string;
  destinationCity: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  cabinClass: CabinClass;
  baggageAllowance?: BaggageAllowance;
  operatingCarrier?: string;
}

export interface BaggageAllowance {
  cabinBag: { quantity: number; weight?: number };
  checkedBag: { quantity: number; weight?: number };
}

export interface FlightOffer {
  offerId: string;
  providerId: string;
  providerOfferRef: string;
  segments: FlightSegment[];
  returnSegments?: FlightSegment[];
  totalPrice: number;
  currency: string;
  basePrice: number;
  taxes: number;
  fees: number;
  cabinClass: CabinClass;
  stops: number;
  totalDuration: number;
  refundable: boolean;
  changeable: boolean;
  changeFeePct?: number;
  validUntil: string;
  fareRules?: string;
  seatsRemaining?: number;
}

export interface FlightPriceCheck {
  offerId: string;
  available: boolean;
  priceChanged: boolean;
  oldPrice: number;
  newPrice: number;
  currency: string;
  validUntil: string;
}

export interface Passenger {
  passengerId: string;
  type: PassengerType;
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  email?: string;
  phone?: string;
  frequentFlyerNumber?: string;
  seatPreference?: "window" | "aisle" | "middle" | "none";
  mealPreference?: string;
}

export interface FlightBooking {
  bookingId: string;
  userId: string;
  status: FlightStatus;
  providerId: string;
  providerBookingRef?: string;
  offer: FlightOffer;
  passengers: Passenger[];
  contactEmail: string;
  contactPhone: string;
  paymentMode: PaymentMode;
  paymentRef?: string;
  totalAmount: number;
  currency: string;
  platformFee: number;
  providerAmount: number;
  holdExpiresAt?: string;
  ticketNumbers?: string[];
  pnr?: string;
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface FlightTicket {
  ticketId: string;
  bookingId: string;
  passengerId: string;
  ticketNumber: string;
  status: TicketStatus;
  pnr: string;
  providerId: string;
  providerTicketRef?: string;
  segments: FlightSegment[];
  issuedAt: string;
  passengerName: string;
}

export interface FlightWebhookPayload {
  eventType: FlightWebhookEvent;
  providerId: string;
  providerRef: string;
  bookingId?: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

export type FlightWebhookEvent =
  | "booking_confirmed"
  | "booking_failed"
  | "booking_cancelled"
  | "ticket_issued"
  | "ticket_void"
  | "schedule_change"
  | "price_change"
  | "refund_processed"
  | "payment_captured"
  | "payment_failed";

export interface FlightRefundRequest {
  bookingId: string;
  reason: string;
  requestedBy: string;
  refundType: "full" | "partial";
  partialAmount?: number;
}

export interface FlightRefundResult {
  bookingId: string;
  success: boolean;
  refundAmount: number;
  currency: string;
  providerRefundRef?: string;
  estimatedDays?: number;
  failureReason?: string;
}

export interface FlightReconciliationEntry {
  bookingId: string;
  providerId: string;
  platformAmount: number;
  providerAmount: number;
  providerReportedAmount?: number;
  discrepancy: number;
  status: "matched" | "discrepancy" | "missing_provider" | "missing_platform";
  checkedAt: string;
}

export interface FlightProviderConfig {
  providerId: string;
  name: string;
  enabled: boolean;
  apiBaseUrl: string;
  supportedRegions?: string[];
  supportedCurrencies?: string[];
  paymentMode: PaymentMode;
  commissionPct: number;
  timeout: number;
  retryAttempts: number;
  webhookSecret?: string;
  priority: number;
}
