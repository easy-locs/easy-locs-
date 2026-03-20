import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDeliveryStore } from "@/stores/deliveryStore";

export function useDeliveryRealtime() {
  useEffect(() => {
    const channel = supabase
      .channel("delivery_jobs_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_jobs",
        },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row) return;

          useDeliveryStore.setState((state) => {
            const exists = state.jobs.some((x) => x.id === row.id);

            if (payload.eventType === "DELETE") {
              return { jobs: state.jobs.filter((x) => x.id !== row.id) };
            }

            if (!exists) {
              return { jobs: [row, ...state.jobs] };
            }

            return {
              jobs: state.jobs.map((x) => (x.id === row.id ? row : x)),
            };
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
}
