import { create } from "zustand";
import { useOrbitStore } from "@/stores/orbitStore";
import { useListingStore } from "@/stores/listingStore";
import { useUnifiedNotificationStore } from "@/stores/unifiedNotificationStore";
import { useChatStore } from "@/stores/chatStore";
import { useMapStore } from "@/stores/mapStore";

type AppHydrationStore = {
  hydrated: boolean;
  hydrating: boolean;
  hydrateApp: () => Promise<void>;
};

export const useAppHydrationStore = create<AppHydrationStore>((set) => ({
  hydrated: false,
  hydrating: false,

  hydrateApp: async () => {
    set({ hydrating: true });

    const orbit = useOrbitStore.getState().profile;

    await useListingStore.getState().hydratePublished();
    useMapStore.getState().buildListingMarkers();

    if (orbit?.userId) {
      await Promise.all([
        useUnifiedNotificationStore.getState().hydrate(orbit.userId),
        useChatStore.getState().hydrateConversations(orbit.orbitId),
      ]);
    }

    set({
      hydrated: true,
      hydrating: false,
    });
  },
}));
