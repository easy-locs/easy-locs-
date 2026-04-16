export type {
  FlightStatus,
  CabinClass,
  TripType,
  PassengerType,
  PaymentMode,
  TicketStatus,
  FlightSearchParams,
  PassengerCount,
  FlightSegment,
  BaggageAllowance,
  FlightOffer,
  FlightPriceCheck,
  Passenger,
  FlightBooking,
  FlightTicket,
  FlightWebhookPayload,
  FlightWebhookEvent,
  FlightRefundRequest,
  FlightRefundResult,
  FlightReconciliationEntry,
  FlightProviderConfig,
} from "@/domains/flight/flight-types";

export {
  FLIGHT_MACHINE,
  transitionFlight,
  canTransitionFlight,
  getValidEvents,
  isTerminalState,
  FLIGHT_STATUS_META,
} from "@/domains/flight/flight-state-machine";
export type { FlightEvent } from "@/domains/flight/flight-state-machine";

export type { FlightProviderAdapter } from "./flight-provider-adapter";
export {
  registerProvider,
  unregisterProvider,
  getProvider,
  getProviderConfig,
  getActiveProviders,
  getProviderForRegion,
  resolvePaymentMode,
  computePlatformFee,
  checkAllProvidersHealth,
} from "./flight-provider-adapter";

export { flightSearchService } from "./flight-search-service";
export { flightPricingService } from "./flight-pricing-service";
export { flightBookingService } from "./flight-booking-service";
export { flightTicketingService } from "./flight-ticketing-service";
export { flightPaymentOrchestrator } from "./flight-payment-orchestrator";
export type { FlightPaymentRequest, FlightPaymentResult } from "./flight-payment-orchestrator";
export { flightWebhookHandler } from "./flight-webhook-handler";
export { flightReconciliationService } from "./flight-reconciliation";
