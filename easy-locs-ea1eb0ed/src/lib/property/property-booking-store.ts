import { db } from "@/services/db";
import { assertNoMockData } from "@/lib/guards/mock-data-guard";
import type {
  PropertySearchParams,
  PropertyListing,
  PropertyBooking,
  PropertyBookingGuest,
  PriceBreakdown,
  PropertyPhoto,
  PropertyAmenity,
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

interface PropertyRow {
  id: string;
  title?: string;
  label?: string;
  description?: string;
  category?: string;
  property_type?: string;
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  photo_urls?: string[];
  amenities?: (string | PropertyAmenity)[];
  host_id?: string;
  user_id?: string;
  host_name?: string;
  superhost?: boolean;
  response_rate?: number;
  response_time?: string;
  host_joined?: string;
  review_count?: number;
  host_rating?: number;
  host_verified?: boolean;
  rating?: number;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  area?: number;
  surface_area?: number;
  area_unit?: "sqm" | "sqft";
  furnished?: boolean;
  pet_friendly?: boolean;
  instant_book?: boolean;
  price?: number;
  price_per_night?: number;
  price_per_month?: number;
  cleaning_fee?: number;
  deposit?: number;
  rules?: string[];
  cancellation_policy?: "flexible" | "moderate" | "strict" | "non_refundable";
  check_in_time?: string;
  check_out_time?: string;
  highlights?: string[];
}

function mapRowToListing(row: PropertyRow, params: PropertySearchParams): PropertyListing {
  const isShort = params.mode === "short_term";
  const photos: PropertyPhoto[] = Array.isArray(row.photo_urls)
    ? row.photo_urls.map((url: string, i: number) => ({ id: `ph_${i}`, url, caption: "", order: i }))
    : [];
  const basePrice = row.price ?? row.price_per_night ?? row.price_per_month ?? 0;

  const amenities: PropertyAmenity[] = Array.isArray(row.amenities)
    ? row.amenities.map((a) => {
        if (typeof a === "string") {
          return { key: a, label: a, category: "essential" as const, available: true };
        }
        return a as PropertyAmenity;
      })
    : [];

  return {
    id: row.id,
    title: row.title ?? row.label ?? "Untitled",
    description: row.description ?? "",
    mode: params.mode,
    category: row.category ?? (isShort ? "apartment" : "rental_monthly"),
    propertyType: row.property_type ?? "apartment",
    location: {
      address: row.address ?? "",
      city: row.city ?? params.location ?? "",
      country: row.country ?? params.country ?? "",
      lat: row.lat,
      lng: row.lng,
    },
    photos,
    coverImage: photos[0]?.url ?? "",
    amenities,
    host: {
      id: row.host_id ?? row.user_id ?? "",
      name: row.host_name ?? "",
      superhost: row.superhost ?? false,
      responseRate: row.response_rate ?? 90,
      responseTime: row.response_time ?? "within a day",
      joinedDate: row.host_joined ?? "",
      reviewCount: row.review_count ?? 0,
      rating: row.host_rating ?? row.rating ?? 0,
      verified: row.host_verified ?? true,
    },
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    reviews: [],
    bedrooms: row.bedrooms ?? 1,
    bathrooms: row.bathrooms ?? 1,
    maxGuests: row.max_guests ?? 2,
    area: row.area ?? row.surface_area,
    areaUnit: row.area_unit ?? "sqm",
    furnished: row.furnished ?? isShort,
    petFriendly: row.pet_friendly ?? false,
    instantBook: row.instant_book ?? false,
    pricing: {
      basePrice,
      pricePerNight: isShort ? basePrice : undefined,
      pricePerMonth: !isShort ? basePrice : undefined,
      cleaningFee: row.cleaning_fee ?? 0,
      serviceFee: Math.round(basePrice * 0.12),
      taxes: Math.round(basePrice * 0.08),
      deposit: row.deposit ?? 0,
      totalPrice: basePrice + Math.round(basePrice * 0.12) + Math.round(basePrice * 0.08) + (row.cleaning_fee ?? 0),
      currency: params.currency,
    },
    availability: [],
    rules: Array.isArray(row.rules) ? row.rules : [],
    cancellationPolicy: row.cancellation_policy ?? "moderate",
    checkInTime: row.check_in_time ?? "15:00",
    checkOutTime: row.check_out_time ?? "11:00",
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
  };
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
      let query = db("properties")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (params.location) {
        query = query.or(`city.ilike.%${params.location}%,country.ilike.%${params.location}%,label.ilike.%${params.location}%`);
      }
      if (params.minPrice != null) {
        query = query.gte("price", params.minPrice);
      }
      if (params.maxPrice != null) {
        query = query.lte("price", params.maxPrice);
      }
      if (params.furnished != null) {
        query = query.eq("furnished", params.furnished);
      }
      if (params.petFriendly != null) {
        query = query.eq("pet_friendly", params.petFriendly);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as PropertyRow[];

      for (const row of rows) {
        assertNoMockData(row.id, "property-booking-search");
      }

      const listings: PropertyListing[] = rows.map((row) =>
        mapRowToListing(row, params),
      );

      set({ listings, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed";
      set({ loading: false, error: msg, listings: [] });
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
      const bookingPayload = {
        user_id: userId,
        property_id: listing.id,
        status: "payment_pending",
        check_in: params?.checkIn,
        check_out: params?.checkOut,
        move_in_date: params?.moveInDate,
        guests: params?.guests ?? { adults: 2, children: 0, infants: 0 },
        guest_info: guest,
        pricing,
        cancellation_policy: listing.cancellationPolicy,
      };

      const { data: bookingRow, error: insertError } = await db("bookings")
        .insert(bookingPayload)
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Booking creation failed: ${insertError.message}`);
      }

      const bookingId = bookingRow?.id as string;
      if (!bookingId) {
        throw new Error("Booking creation failed: no booking ID returned");
      }

      const booking: PropertyBooking = {
        bookingId,
        bookingRef: `EL-${bookingId.slice(0, 6).toUpperCase()}`,
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

  async confirmPayment(paymentMethod: string, providerRef?: string) {
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
      const paymentRef = providerRef || `PAY-${Date.now()}`;

      const updateData: Record<string, unknown> = {
        status: "confirmed",
        payment_method: paymentMethod,
        payment_ref: paymentRef,
      };
      if (providerRef && paymentRef.startsWith("pi_")) {
        updateData.stripe_payment_intent_id = providerRef;
      }

      const { error: updateError } = await db("bookings")
        .update(updateData)
        .eq("id", booking.bookingId);

      if (updateError) {
        throw new Error(`Payment confirmation failed: ${updateError.message}`);
      }

      const confirmed: PropertyBooking = {
        ...booking,
        status: "confirmed",
        paymentMethod,
        paymentRef,
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
