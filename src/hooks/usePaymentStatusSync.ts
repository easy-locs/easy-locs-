import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { useActivityLogStore } from "@/stores/activityLogStore";
import { useOrbitStore } from "@/stores/orbitStore";

export function usePaymentStatusSync() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    const bookingId = searchParams.get("booking");
    const rentId = searchParams.get("rent");

    if (!status) return;

    void (async () => {
      const orbit = useOrbitStore.getState().profile;
      if (orbit) {
        await useNotificationsStore.getState().hydrate(orbit.orbitId);
      }

      if (status === "success" && bookingId) {
        await useActivityLogStore.getState().log({
          action: "booking_payment_success_redirect",
          entityType: "booking",
          entityId: bookingId,
          metadata: { status },
        });
      }

      if (status === "success" && rentId) {
        await useActivityLogStore.getState().log({
          action: "rent_payment_success_redirect",
          entityType: "rent_payment",
          entityId: rentId,
          metadata: { status },
        });
      }

      const next = new URLSearchParams(searchParams);
      next.delete("status");
      setSearchParams(next, { replace: true });
    })();
  }, [searchParams, setSearchParams]);
}
