import type {
  FlightSearchParams,
  FlightOffer,
  FlightPriceCheck,
  FlightBooking,
  FlightTicket,
  FlightRefundResult,
  FlightRefundRequest,
  FlightProviderConfig,
  Passenger,
  FlightWebhookPayload,
} from "@/domains/flight/flight-types";
import { guardMockProvider } from "@/lib/guards/mock-data-guard";

export interface FlightProviderAdapter {
  readonly providerId: string;
  readonly name: string;

  search(params: FlightSearchParams): Promise<FlightOffer[]>;
  reprice(offerId: string, providerOfferRef: string): Promise<FlightPriceCheck>;
  createBooking(
    offer: FlightOffer,
    passengers: Passenger[],
    contactEmail: string,
    contactPhone: string,
  ): Promise<{ providerBookingRef: string; holdExpiresAt: string; pnr: string }>;
  confirmPayment(providerBookingRef: string, paymentRef: string): Promise<boolean>;
  issueTickets(providerBookingRef: string): Promise<FlightTicket[]>;
  cancelBooking(providerBookingRef: string): Promise<boolean>;
  requestRefund(providerBookingRef: string, request: FlightRefundRequest): Promise<FlightRefundResult>;
  verifyWebhookSignature(payload: FlightWebhookPayload): boolean;
  getBookingStatus(providerBookingRef: string): Promise<{ status: string; data: Record<string, unknown> }>;
  healthCheck(): Promise<boolean>;
}

const providers = new Map<string, FlightProviderAdapter>();
const configs = new Map<string, FlightProviderConfig>();

export function registerProvider(config: FlightProviderConfig, adapter: FlightProviderAdapter): void {
  guardMockProvider(config.providerId);
  configs.set(config.providerId, config);
  providers.set(config.providerId, adapter);
}

export function unregisterProvider(providerId: string): void {
  providers.delete(providerId);
  configs.delete(providerId);
}

export function getProvider(providerId: string): FlightProviderAdapter | null {
  return providers.get(providerId) ?? null;
}

export function getProviderConfig(providerId: string): FlightProviderConfig | null {
  return configs.get(providerId) ?? null;
}

export function getActiveProviders(): FlightProviderAdapter[] {
  return Array.from(configs.entries())
    .filter(([, cfg]) => cfg.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([id]) => providers.get(id)!)
    .filter(Boolean);
}

export function getProviderForRegion(region: string): FlightProviderAdapter[] {
  return Array.from(configs.entries())
    .filter(([, cfg]) => cfg.enabled && (!cfg.supportedRegions || cfg.supportedRegions.includes(region)))
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([id]) => providers.get(id)!)
    .filter(Boolean);
}

export function resolvePaymentMode(providerId: string): FlightProviderConfig["paymentMode"] {
  return configs.get(providerId)?.paymentMode ?? "platform";
}

export function computePlatformFee(amount: number, providerId: string): { platformFee: number; providerAmount: number } {
  const config = configs.get(providerId);
  const commissionPct = config?.commissionPct ?? 5;
  const platformFee = Math.round(amount * (commissionPct / 100) * 100) / 100;
  return { platformFee, providerAmount: Math.round((amount - platformFee) * 100) / 100 };
}

export async function checkAllProvidersHealth(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  for (const [id, adapter] of providers) {
    try {
      results[id] = await adapter.healthCheck();
    } catch {
      results[id] = false;
    }
  }
  return results;
}

function assertNotProduction(context: string): void {
  const isProd =
    (typeof import.meta !== "undefined" && import.meta.env?.PROD === true) ||
    (typeof import.meta !== "undefined" && import.meta.env?.MODE === "production");
  if (isProd) {
    throw new Error(`[MOCK_GUARD] ${context} cannot be used in production`);
  }
}

export const mockProviderAdapter: FlightProviderAdapter = {
  providerId: "mock_dev",
  name: "Development Mock Provider",

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    assertNotProduction("mockProviderAdapter.search");
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    return [
      {
        offerId: `mock_offer_${Date.now()}_1`,
        providerId: "mock_dev",
        providerOfferRef: `MOCK_REF_${Date.now()}_1`,
        segments: [{
          segmentId: `seg_${Date.now()}_1`,
          airline: "Mock Airlines",
          airlineCode: "MK",
          flightNumber: "MK101",
          aircraft: "A320",
          origin: params.origin,
          originCity: params.origin,
          originAirport: `${params.origin} International`,
          destination: params.destination,
          destinationCity: params.destination,
          destinationAirport: `${params.destination} International`,
          departureTime: `${params.departureDate}T08:00:00Z`,
          arrivalTime: `${params.departureDate}T11:30:00Z`,
          duration: 210,
          cabinClass: params.cabinClass,
          baggageAllowance: { cabinBag: { quantity: 1, weight: 8 }, checkedBag: { quantity: 1, weight: 23 } },
        }],
        totalPrice: 245.00,
        currency: params.currency,
        basePrice: 195.00,
        taxes: 40.00,
        fees: 10.00,
        cabinClass: params.cabinClass,
        stops: 0,
        totalDuration: 210,
        refundable: true,
        changeable: true,
        changeFeePct: 15,
        validUntil,
        seatsRemaining: 6,
      },
      {
        offerId: `mock_offer_${Date.now()}_2`,
        providerId: "mock_dev",
        providerOfferRef: `MOCK_REF_${Date.now()}_2`,
        segments: [{
          segmentId: `seg_${Date.now()}_2a`,
          airline: "Mock Connect",
          airlineCode: "MC",
          flightNumber: "MC202",
          aircraft: "B737",
          origin: params.origin,
          originCity: params.origin,
          originAirport: `${params.origin} International`,
          destination: "HUB",
          destinationCity: "Hub City",
          destinationAirport: "Hub International",
          departureTime: `${params.departureDate}T06:00:00Z`,
          arrivalTime: `${params.departureDate}T08:00:00Z`,
          duration: 120,
          cabinClass: params.cabinClass,
        }, {
          segmentId: `seg_${Date.now()}_2b`,
          airline: "Mock Connect",
          airlineCode: "MC",
          flightNumber: "MC303",
          aircraft: "A321",
          origin: "HUB",
          originCity: "Hub City",
          originAirport: "Hub International",
          destination: params.destination,
          destinationCity: params.destination,
          destinationAirport: `${params.destination} International`,
          departureTime: `${params.departureDate}T09:30:00Z`,
          arrivalTime: `${params.departureDate}T12:45:00Z`,
          duration: 195,
          cabinClass: params.cabinClass,
        }],
        totalPrice: 189.00,
        currency: params.currency,
        basePrice: 145.00,
        taxes: 35.00,
        fees: 9.00,
        cabinClass: params.cabinClass,
        stops: 1,
        totalDuration: 405,
        refundable: false,
        changeable: true,
        changeFeePct: 25,
        validUntil,
        seatsRemaining: 12,
      },
    ];
  },

  async reprice(offerId: string): Promise<FlightPriceCheck> {
    assertNotProduction("mockProviderAdapter.reprice");
    return {
      offerId,
      available: true,
      priceChanged: false,
      oldPrice: 245.00,
      newPrice: 245.00,
      currency: "EUR",
      validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },

  async createBooking(_offer, _passengers, _contactEmail, _contactPhone) {
    assertNotProduction("mockProviderAdapter.createBooking");
    const ref = `MOCK_BK_${Date.now()}`;
    return {
      providerBookingRef: ref,
      holdExpiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      pnr: `MCK${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    };
  },

  async confirmPayment(): Promise<boolean> {
    assertNotProduction("mockProviderAdapter.confirmPayment");
    return true;
  },

  async issueTickets(providerBookingRef: string): Promise<FlightTicket[]> {
    assertNotProduction("mockProviderAdapter.issueTickets");
    return [{
      ticketId: `tkt_${Date.now()}`,
      bookingId: "",
      passengerId: "",
      ticketNumber: `081-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      status: "issued",
      pnr: providerBookingRef.slice(0, 6),
      providerId: "mock_dev",
      providerTicketRef: `MOCK_TKT_${Date.now()}`,
      segments: [],
      issuedAt: new Date().toISOString(),
      passengerName: "Mock Passenger",
    }];
  },

  async cancelBooking(): Promise<boolean> {
    assertNotProduction("mockProviderAdapter.cancelBooking");
    return true;
  },

  async requestRefund(_ref, request: FlightRefundRequest): Promise<FlightRefundResult> {
    assertNotProduction("mockProviderAdapter.requestRefund");
    return {
      bookingId: request.bookingId,
      success: true,
      refundAmount: request.partialAmount ?? 245.00,
      currency: "EUR",
      providerRefundRef: `MOCK_RF_${Date.now()}`,
      estimatedDays: 5,
    };
  },

  verifyWebhookSignature(): boolean {
    assertNotProduction("mockProviderAdapter.verifyWebhookSignature");
    return true;
  },

  async getBookingStatus(providerBookingRef: string) {
    assertNotProduction("mockProviderAdapter.getBookingStatus");
    return { status: "confirmed", data: { ref: providerBookingRef } };
  },

  async healthCheck(): Promise<boolean> {
    assertNotProduction("mockProviderAdapter.healthCheck");
    return true;
  },
};
