import { create } from "zustand";
import type { PropertyListingV2 } from "@/domains/shared/canonical-types";
import type { CalendarDayCell } from "@/lib/types/calendar";
import { useListingStore } from "@/stores/listingStore";
import { useBookingStore } from "@/stores/bookingStore";
import { buildCurrentMonthCalendar } from "@/lib/utils/calendar";

type PropertyDetailStore = {
  activeListingId: string | null;
  selectedListing: PropertyListingV2 | null;
  calendarDays: CalendarDayCell[];

  openListing: (listingId: string) => void;
  closeListing: () => void;
  refreshCalendar: () => void;
};

export const usePropertyDetailStore = create<PropertyDetailStore>((set, get) => ({
  activeListingId: null,
  selectedListing: null,
  calendarDays: [],

  openListing: (listingId) => {
    const listing = useListingStore.getState().getListingById(listingId);
    if (!listing) return;

    const bookings = useBookingStore.getState().getBookingsByListing(listingId);
    const calendarDays = buildCurrentMonthCalendar(listing.availability, bookings);

    set({
      activeListingId: listingId,
      selectedListing: listing,
      calendarDays,
    });
  },

  closeListing: () => {
    set({
      activeListingId: null,
      selectedListing: null,
      calendarDays: [],
    });
  },

  refreshCalendar: () => {
    const listingId = get().activeListingId;
    if (!listingId) return;

    const listing = useListingStore.getState().getListingById(listingId);
    if (!listing) return;

    const bookings = useBookingStore.getState().getBookingsByListing(listingId);
    const calendarDays = buildCurrentMonthCalendar(listing.availability, bookings);

    set({
      selectedListing: listing,
      calendarDays,
    });
  },
}));
