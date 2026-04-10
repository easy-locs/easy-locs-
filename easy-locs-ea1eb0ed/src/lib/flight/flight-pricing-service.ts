import type { FlightOffer, FlightPriceCheck } from "@/domains/flight/flight-types";
import { getProvider } from "./flight-provider-adapter";
import { platformBus } from "@/lib/shared/platform-bus";

const repriceCache = new Map<string, { result: FlightPriceCheck; expiresAt: number }>();
const REPRICE_CACHE_TTL = 2 * 60 * 1000;

export const flightPricingService = {
  async reprice(offer: FlightOffer): Promise<FlightPriceCheck> {
    const cached = repriceCache.get(offer.offerId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const adapter = getProvider(offer.providerId);
    if (!adapter) {
      throw new Error(`Provider ${offer.providerId} not found`);
    }

    const result = await adapter.reprice(offer.offerId, offer.providerOfferRef);

    repriceCache.set(offer.offerId, {
      result,
      expiresAt: Date.now() + REPRICE_CACHE_TTL,
    });

    if (result.priceChanged) {
      platformBus.emit("flight:price_changed", {
        offerId: offer.offerId,
        oldPrice: result.oldPrice,
        newPrice: result.newPrice,
        currency: result.currency,
      });
    }

    return result;
  },

  isOfferExpired(offer: FlightOffer): boolean {
    return new Date(offer.validUntil).getTime() < Date.now();
  },

  computeTotalForPassengers(
    basePrice: number,
    taxes: number,
    fees: number,
    adults: number,
    children: number,
    infants: number,
  ): { total: number; breakdown: { adults: number; children: number; infants: number } } {
    const adultTotal = (basePrice + taxes + fees) * adults;
    const childTotal = (basePrice * 0.75 + taxes + fees) * children;
    const infantTotal = (basePrice * 0.1 + taxes * 0.5) * infants;
    return {
      total: Math.round((adultTotal + childTotal + infantTotal) * 100) / 100,
      breakdown: {
        adults: Math.round(adultTotal * 100) / 100,
        children: Math.round(childTotal * 100) / 100,
        infants: Math.round(infantTotal * 100) / 100,
      },
    };
  },

  clearCache(): void {
    repriceCache.clear();
  },
};
