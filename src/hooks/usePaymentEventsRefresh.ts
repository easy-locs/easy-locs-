import { useEffect } from "react";
import { subscribeTable } from "@/lib/supabase/realtime";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useBookingStore } from "@/stores/bookingStore";
import { usePropertyManagementStore } from "@/stores/propertyManagementStore";

export function usePaymentEventsRefresh() {
  useEffect(() => {
    const { unsubscribe, ref } = subscribeTable({
      key: "wallet_transactions_refresh",
      channelName: "wallet_transactions_refresh",
      table: "wallet_transactions",
      callback: async () => {
        useBookingStore.setState((state) => ({ ...state }));
        usePropertyManagementStore.setState((state) => ({ ...state }));
      },
    });

    useRealtimeStore.getState().addSubscription(ref);

    return () => {
      unsubscribe();
      useRealtimeStore.getState().removeSubscription(ref.key);
    };
  }, []);
}
