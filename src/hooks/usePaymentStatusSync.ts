import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useUnifiedNotificationStore } from "@/stores/unifiedNotificationStore";
import { useActivityLogStore } from "@/stores/activityLogStore";
import { useAuth } from "@/contexts/AuthContext";

export function usePaymentStatusSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    const status = searchParams.get("status");
    const bookingId = searchParams.get("booking");
    const rentId = searchParams.get("rent");

    if (!status) return;

    void (async () => {
      if (user?.id) {
        await useUnifiedNotificationStore.getState().hydrate(user.id);
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
  }, [searchParams, setSearchParams, user?.id]);
}
