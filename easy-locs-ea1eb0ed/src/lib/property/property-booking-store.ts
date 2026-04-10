import type {
  PropertySearchParams,
  PropertyListing,
  PropertyBooking,
  PropertyBookingGuest,
  PriceBreakdown,
} from "@/domains/property/property-booking-types";

export interface PropertyBookingState {
  searchParams: PropertySearchParams | null;
  listings: PropertyListing[];
  selectedListing: PropertyListing | null;
  pricing: PriceBreakdown | null;
  guest: PropertyBookingGuest | null;
  booking: PropertyBooking | null;
  loading: boolean;
  error: string | null;
}

type Listener = () => void;

const INITIAL: PropertyBookingState = {
  searchParams: null,
  listings: [],
  selectedListing: null,
  pricing: null,
  guest: null,
  booking: null,
  loading: false,
  error: null,
};

let state: PropertyBookingState = { ...INITIAL };
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn();
}

function set(partial: Partial<PropertyBookingState>) {
  state = { ...state, ...partial };
  emit();
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function computePricing(listing: PropertyListing, nights: number): PriceBreakdown {
  const pricePerNight = listing.pricing.pricePerNight ?? listing.pricing.basePrice;
  const basePrice = pricePerNight * nights;
  const cleaningFee = listing.pricing.cleaningFee;
  const serviceFee = Math.round(basePrice * 0.12);
  const taxes = Math.round(basePrice * 0.08);
  const deposit = listing.pricing.deposit ?? 0;
  return {
    basePrice,
    nights,
    pricePerNight,
    cleaningFee,
    serviceFee,
    taxes,
    deposit,
    totalPrice: basePrice + cleaningFee + serviceFee + taxes,
    currency: listing.pricing.currency,
  };
}

function computeNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

export const propertyBookingStore = {
  getState(): PropertyBookingState {
    return state;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  clearError() {
    set({ error: null });
  },

  reset() {
    state = { ...INITIAL };
    emit();
  },

  async search(params: PropertySearchParams) {
    if (params.mode === "short_term") {
      if (!params.checkIn || !params.checkOut) {
        const msg = "Please select check-in and check-out dates";
        set({ error: msg });
        throw new Error(msg);
      }
      if (new Date(params.checkOut) <= new Date(params.checkIn)) {
        const msg = "Check-out date must be after check-in date";
        set({ error: msg });
        throw new Error(msg);
      }
    }
    set({
      loading: true,
      error: null,
      searchParams: params,
      selectedListing: null,
      pricing: null,
      guest: null,
      booking: null,
    });
    try {
      await new Promise(r => setTimeout(r, 600));

      const mockListings = generateMockListings(params);
      set({ listings: mockListings, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed";
      set({ loading: false, error: msg });
      throw e;
    }
  },

  selectListing(listing: PropertyListing) {
    const params = state.searchParams;
    let pricing = listing.pricing;
    if (params?.checkIn && params?.checkOut) {
      const nights = computeNights(params.checkIn, params.checkOut);
      pricing = computePricing(listing, nights);
    }
    set({
      selectedListing: listing,
      pricing,
      guest: null,
      booking: null,
      error: null,
    });
  },

  async createBooking(
    userId: string,
    guest: PropertyBookingGuest,
  ) {
    const listing = state.selectedListing;
    const params = state.searchParams;
    const pricing = state.pricing;
    if (!listing) {
      const msg = "No property selected";
      set({ error: msg });
      throw new Error(msg);
    }
    if (!pricing) {
      const msg = "No pricing available";
      set({ error: msg });
      throw new Error(msg);
    }

    set({ loading: true, error: null, guest });
    try {
      await new Promise(r => setTimeout(r, 400));

      const booking: PropertyBooking = {
        bookingId: generateId("pb"),
        bookingRef: `EL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        userId,
        propertyId: listing.id,
        propertyTitle: listing.title,
        propertyCoverImage: listing.coverImage,
        mode: listing.mode,
        status: "payment_pending",
        checkIn: params?.checkIn,
        checkOut: params?.checkOut,
        moveInDate: params?.moveInDate,
        guests: params?.guests ?? { adults: 2, children: 0, infants: 0 },
        mainGuest: guest,
        pricing,
        hostId: listing.host.id,
        hostName: listing.host.name,
        cancellationPolicy: listing.cancellationPolicy,
        createdAt: new Date().toISOString(),
      };
      set({ booking, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      set({ loading: false, error: msg });
      throw e;
    }
  },

  async confirmPayment(paymentMethod: string) {
    const booking = state.booking;
    if (!booking) {
      const msg = "No active booking";
      set({ error: msg });
      throw new Error(msg);
    }
    if (booking.status !== "payment_pending") {
      const msg = "This booking has already been processed";
      set({ error: msg });
      throw new Error(msg);
    }

    set({ loading: true, error: null });
    try {
      await new Promise(r => setTimeout(r, 500));

      const confirmed: PropertyBooking = {
        ...booking,
        status: "confirmed",
        paymentMethod,
        paymentRef: `PAY-${Date.now()}`,
        confirmedAt: new Date().toISOString(),
      };
      set({ booking: confirmed, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      set({ loading: false, error: msg });
      throw e;
    }
  },
};

function generateMockListings(params: PropertySearchParams): PropertyListing[] {
  const isShort = params.mode === "short_term";
  const names = isShort
    ? [
        "Luxury Downtown Apartment", "Seaside Villa with Pool", "Cozy Studio in Old Town",
        "Modern Loft with Terrace", "Boutique Hotel Room", "Charming Cottage by the Lake",
        "Penthouse with City Views", "Family-Friendly Resort Suite",
      ]
    : [
        "Spacious 2BR Apartment", "Modern Office Space", "Family Home with Garden",
        "Studio for Professionals", "3BR Furnished Flat", "Renovated Townhouse",
        "Luxury Penthouse", "Affordable Studio",
      ];

  return names.map((title, i) => {
    const basePrice = isShort ? 60 + i * 30 : 800 + i * 200;
    const rating = 4.0 + Math.round(Math.random() * 10) / 10;
    return {
      id: `prop_${i}_${Date.now()}`,
      title,
      description: `Beautiful ${isShort ? "vacation" : "long-term"} property in ${params.location || "the city"}. Fully equipped and ready for your ${isShort ? "stay" : "move"}.`,
      mode: params.mode,
      category: isShort ? "apartment" : "rental_monthly",
      propertyType: isShort ? "apartment" : "apartment",
      location: {
        address: `${100 + i} Main Street`,
        city: params.location || "City Center",
        country: params.country ?? "FR",
      },
      photos: [
        { id: `ph_${i}_0`, url: "", caption: "Living room", order: 0 },
        { id: `ph_${i}_1`, url: "", caption: "Bedroom", order: 1 },
        { id: `ph_${i}_2`, url: "", caption: "Kitchen", order: 2 },
      ],
      coverImage: "",
      amenities: [
        { key: "wifi", label: "WiFi", category: "essential", available: true },
        { key: "kitchen", label: "Kitchen", category: "kitchen", available: true },
        { key: "ac", label: "Air Conditioning", category: "comfort", available: i % 2 === 0 },
        { key: "parking", label: "Parking", category: "essential", available: i % 3 === 0 },
        { key: "pool", label: "Pool", category: "outdoor", available: i % 4 === 0 },
        { key: "washer", label: "Washer", category: "essential", available: true },
      ],
      host: {
        id: `host_${i}`,
        name: ["Marie", "Jean", "Sofia", "Karim", "Yuki", "Ahmed", "Lucia", "Chen"][i],
        superhost: i % 3 === 0,
        responseRate: 90 + (i % 10),
        responseTime: "within an hour",
        joinedDate: "2021-06-15",
        reviewCount: 20 + i * 12,
        rating: Math.min(5, rating),
        verified: true,
      },
      rating: Math.min(5, rating),
      reviewCount: 20 + i * 12,
      reviews: [],
      bedrooms: 1 + (i % 3),
      bathrooms: 1 + (i % 2),
      maxGuests: 2 + (i % 4),
      area: 40 + i * 15,
      areaUnit: "sqm",
      furnished: isShort || i % 2 === 0,
      petFriendly: i % 3 === 0,
      instantBook: i % 2 === 0,
      pricing: {
        basePrice,
        pricePerNight: isShort ? basePrice : undefined,
        pricePerMonth: !isShort ? basePrice : undefined,
        cleaningFee: isShort ? 30 + i * 5 : 0,
        serviceFee: Math.round(basePrice * 0.12),
        taxes: Math.round(basePrice * 0.08),
        deposit: isShort ? 0 : basePrice,
        totalPrice: basePrice + Math.round(basePrice * 0.12) + Math.round(basePrice * 0.08) + (isShort ? 30 + i * 5 : 0),
        currency: params.currency,
      },
      availability: [],
      rules: ["No smoking", "No parties", "Check-in after 3 PM"],
      cancellationPolicy: (["flexible", "moderate", "strict"] as const)[i % 3],
      checkInTime: "15:00",
      checkOutTime: "11:00",
      highlights: isShort
        ? ["Great location", "Fast WiFi", "Self check-in"]
        : ["Long-term discount", "Near public transport", "Pet friendly"],
    };
  });
}
