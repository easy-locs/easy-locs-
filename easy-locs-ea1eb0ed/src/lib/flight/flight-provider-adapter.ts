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

