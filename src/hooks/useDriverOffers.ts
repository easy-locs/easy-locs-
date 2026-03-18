/**
 * useDriverOffers — Driver-side hook listening for incoming ride offers via broadcast.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RideOffer {
  ride_request_id: string;
  driver_id: string;
  pickup_lat: number;
  pickup_lng: number;
}

export function useDriverOffers(driverId: string | null) {
  const [offers, setOffers] = useState<RideOffer[]>([]);

  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`driver-offers:${driverId}`)
      .on("broadcast", { event: "ride_request" }, ({ payload }) => {
        if (payload?.driver_id === driverId) {
          setOffers(prev => [payload as RideOffer, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const dismiss = (rideRequestId: string) => {
    setOffers(prev => prev.filter(o => o.ride_request_id !== rideRequestId));
  };

  return { offers, dismiss };
}
