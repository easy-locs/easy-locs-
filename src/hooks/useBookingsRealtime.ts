import { useEffect } from "react";
import { subscribeTable } from "@/lib/supabase/realtime";
import { useRealtimeStore } from "@/stores/realtimeStore";

export function useBookingsRealtime() {
  useEffect(() => {
    const { unsubscribe, ref } = subscribeTable({
      key: "bookings_realtime",
      channelName: "bookings_realtime",
      table: "bookings",
      callback: () => {
        // hook ready for future hydration path
      },
    });

    useRealtimeStore.getState().addSubscription(ref);

    return () => {
      unsubscribe();
      useRealtimeStore.getState().removeSubscription(ref.key);
    };
  }, []);
}
