import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type { PropertyListingV2, ListingAvailabilityRange, CurrencyCode } from "@/lib/types/domain";
import { listingRepo } from "@/lib/supabase/repositories";
import { requireOrbitIdentity, getOrbitIdentity } from "@/hooks/useOrbitIdentity";

type CreateListingInput = {
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
  hydratePublished: () => Promise<void>;
  createListing: (input: CreateListingInput) => Promise<PropertyListingV2>;
  updateListing: (listingId: string, patch: Partial<PropertyListingV2>) => void;
  publishListing: (listingId: string) => void;
  pauseListing: (listingId: string) => void;
  archiveListing: (listingId: string) => void;
  setAvailability: (listingId: string, ranges: ListingAvailabilityRange[]) => void;
  addAvailabilityRange: (listingId: string, range: ListingAvailabilityRange) => void;
  getListingById: (listingId: string) => PropertyListingV2 | null;
  getPublishedListings: () => PropertyListingV2[];
  getMyListings: () => PropertyListingV2[];
  getListingsByOwner: (ownerOrbitId: string) => PropertyListingV2[];
};

export const useListingStore = create<ListingStore>((set, get) => ({
  listings: [],
  loading: false,

  hydratePublished: async () => {
    set({ loading: true });
    try {
      const listings = await listingRepo.listPublished();
      set({ listings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createListing: async (input) => {
    const orbit = requireOrbitIdentity();

    const now = new Date().toISOString();
    const listing: PropertyListingV2 = {
      id: `listing_${Math.random().toString(36).slice(2, 11)}`,
      ownerOrbitId: orbit.orbitId,
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

    const saved = await listingRepo.create(listing);
    set((state) => ({ listings: [saved, ...state.listings] }));
    platformBus.emit("listing:created", { listing: saved }, "marketplace");
    return saved;
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
      platformBus.emit("listing:updated", { listing: updated }, "marketplace");
    }
  },

  publishListing: (listingId) => {
    get().updateListing(listingId, { status: "published" });
    platformBus.emit("listing:published", { listingId }, "marketplace");
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
  getMyListings: () => {
    const identity = getOrbitIdentity();
    if (!identity) return [];
    return get().listings.filter((l) => l.ownerOrbitId === identity.orbitId);
  },
  getListingsByOwner: (ownerOrbitId) => get().listings.filter((l) => l.ownerOrbitId === ownerOrbitId),
}));
