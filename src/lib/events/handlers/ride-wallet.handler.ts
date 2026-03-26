import { eventBus } from "@/lib/core/event-bus";

export function initRideWalletHandler() {
  eventBus.on("ride.completed", (payload) => {
    void eventBus.emit("wallet.payment.required", {
      context: "ride",
      jobId: payload.jobId,
    });
  });
}
