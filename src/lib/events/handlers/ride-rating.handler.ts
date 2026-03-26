import { eventBus } from "@/lib/core/event-bus";

export function initRideRatingHandler() {
  eventBus.on("ride.completed", (payload) => {
    setTimeout(() => {
      void eventBus.emit("ride.rating.requested", {
        jobId: payload.jobId,
      });
    }, 2500);
  });
}
