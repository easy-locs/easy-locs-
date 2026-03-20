import { useEffect } from "react";
import { subscribeTable } from "@/lib/supabase/realtime";
import { useListingStore } from "@/stores/listingStore";
import { useRealtimeStore } from "@/stores/realtimeStore";

export function useListingsRealtime() {
  useEffect(() => {
    const { unsubscribe, ref } = subscribeTable({
      key: "property_listings_realtime",
      channelName: "property_listings_realtime",
      table: "property_listings",
      callback: async () => {
        await useListingStore.getState().hydratePublished();
      },
    });

    useRealtimeStore.getState().addSubscription(ref);

    return () => {
      unsubscribe();
      useRealtimeStore.getState().removeSubscription(ref.key);
    };
  }, []);
}
