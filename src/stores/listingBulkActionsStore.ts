import { create } from "zustand";
import { useListingStore } from "@/stores/listingStore";

type ListingBulkActionsStore = {
  loading: boolean;
  bulkPublish: (listingIds: string[]) => Promise<void>;
  bulkPause: (listingIds: string[]) => Promise<void>;
  bulkArchive: (listingIds: string[]) => Promise<void>;
};

export const useListingBulkActionsStore = create<ListingBulkActionsStore>((set) => ({
  loading: false,

  bulkPublish: async (listingIds) => {
    set({ loading: true });
    for (const id of listingIds) {
      useListingStore.getState().publishListing(id);
    }
    set({ loading: false });
  },

  bulkPause: async (listingIds) => {
    set({ loading: true });
    for (const id of listingIds) {
      useListingStore.getState().pauseListing(id);
    }
    set({ loading: false });
  },

  bulkArchive: async (listingIds) => {
    set({ loading: true });
    for (const id of listingIds) {
      useListingStore.getState().archiveListing(id);
    }
    set({ loading: false });
  },
}));
