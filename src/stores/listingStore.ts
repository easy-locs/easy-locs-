import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";
import type { PropertyListingV2, ListingAvailabilityRange } from "@/lib/types/booking";
import type { CurrencyCode } from "@/lib/types/app";

type CreateListingInput = {
  ownerOrbitId: string;
  title: string;
  description?: string;
  address: string;
  city?: string;
  country?: string;
  lat: number;
  lng: number;
  currency?: CurrencyCode;
  nightPrice: number;
  cleaningFee?: number;
  serviceFee?: number;
  securityDeposit?: number;
  monthlyRent?: number;
  flowMode?: "instant_book" | "request_to_book";
};

type ListingStore = {
  listings: PropertyListingV2[];
  loading: boolean;

  createListing: (input: CreateListingInput) => PropertyListingV2;
  updateListing: (listingId: string, patch: Partial<PropertyListingV2>) => void;
  publishListing: (listingId: string) => void;
  pauseListing: (listingId: string) => void;
  archiveListing: (listingId: string) => void;
  setAvailability: (listingId: string, ranges: ListingAvailabilityRange[]) => void;
  addAvailabilityRange: (listingId: string, range: ListingAvailabilityRange) => void;
  getListingById: (listingId: string) => PropertyListingV2 | null;
  getPublishedListings: () => PropertyListingV2[];
  getListingsByOwner: (ownerOrbitId: string) => PropertyListingV2[];
};

export const useListingStore = create<ListingStore>((set, get) => ({
  listings: [],
  loading: false,

  createListing: (input) => {
    const now = new Date().toISOString();
    const listing: PropertyListingV2 = {
      id: `listing_${Math.random().toString(36).slice(2, 11)}`,
      ownerOrbitId: input.ownerOrbitId,
      status: "draft",
      title: input.title,
      description: input.description,
      category: "property",
      serviceModes: ["direct_booking", "chat_only"],
      flowMode: input.flowMode ?? "instant_book",
      location: {
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        city: input.city,
        country: input.country,
      },
      pricing: {
        currency: input.currency ?? "AED",
        nightPrice: input.nightPrice,
        cleaningFee: input.cleaningFee ?? 0,
        serviceFee: input.serviceFee ?? 0,
        securityDeposit: input.securityDeposit ?? 0,
        monthlyRent: input.monthlyRent ?? 0,
      },
      capacity: { guests: 2, bedrooms: 1, beds: 1, bathrooms: 1 },
      media: [],
      tags: [],
      walletLinked: true,
      bookingEnabled: true,
      orbitLinked: true,
      serviceConfig: {
        chatEnabled: true,
        callEnabled: true,
        directBookingEnabled: true,
        qrPaymentEnabled: true,
        orbitEscrowEnabled: true,
        propertyManagementEnabled: true,
      },
      availability: [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ listings: [listing, ...state.listings] }));
    platformBus.emit({ type: "listing.created", payload: { listing } });
    return listing;
  },

  updateListing: (listingId, patch) => {
    let updated: PropertyListingV2 | null = null;
    set((state) => ({
      listings: state.listings.map((l) => {
        if (l.id !== listingId) return l;
        updated = { ...l, ...patch, updatedAt: new Date().toISOString() };
        return updated!;
      }),
    }));
    if (updated) {
      platformBus.emit({ type: "listing.updated", payload: { listing: updated } });
    }
  },

  publishListing: (listingId) => {
    get().updateListing(listingId, { status: "published" });
    platformBus.emit({ type: "listing.published", payload: { listingId } });
  },

  pauseListing: (listingId) => { get().updateListing(listingId, { status: "paused" }); },
  archiveListing: (listingId) => { get().updateListing(listingId, { status: "archived" }); },

  setAvailability: (listingId, ranges) => { get().updateListing(listingId, { availability: ranges }); },

  addAvailabilityRange: (listingId, range) => {
    const listing = get().getListingById(listingId);
    if (!listing) return;
    get().updateListing(listingId, { availability: [...listing.availability, range] });
  },

  getListingById: (listingId) => get().listings.find((l) => l.id === listingId) ?? null,
  getPublishedListings: () => get().listings.filter((l) => l.status === "published"),
  getListingsByOwner: (ownerOrbitId) => get().listings.filter((l) => l.ownerOrbitId === ownerOrbitId),
}));
