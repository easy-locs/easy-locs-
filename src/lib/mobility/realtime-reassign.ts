import { eventBus } from "@/lib/core/event-bus";

export function handleRealtimeIssues(jobId: string, health: string) {
  if (health === "lost") {
    void eventBus.emit("ride.reassign.requested", {
      jobId,
      reason: "gps_lost",
    });
  }
}
