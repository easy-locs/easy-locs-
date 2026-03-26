/**
 * Ride Postflow Handler — triggers wallet payment + rating after ride completion.
 */
import { eventBus } from "@/lib/core/event-bus";

eventBus.on("ride.completed", (payload) => {
  const { jobId, customerUserId, riderUserId, currentPrice, currency } = payload as Record<string, any>;

  void eventBus.emit("wallet.payment.required", {
    context_type: "mobility_ride",
    context_id: jobId,
    user_id: customerUserId,
    amount: currentPrice ?? 0,
    currency: currency ?? "AED",
    metadata: {
      rider_user_id: riderUserId,
    },
  });

  setTimeout(() => {
    void eventBus.emit("ride.rating.requested", {
      jobId,
      customerUserId,
      riderUserId,
    });
  }, 2500);
});

if (import.meta.env.DEV) {
  console.log("[ride-postflow] Postflow handler active");
}
