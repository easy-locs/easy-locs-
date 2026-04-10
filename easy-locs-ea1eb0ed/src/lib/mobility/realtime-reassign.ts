import { eventBus } from "@/lib/core/event-bus";

const reassignDebounce = new Map<string, number>();

export function handleRealtimeIssues(jobId: string, health: "ok" | "weak" | "lost") {
  if (health !== "lost") return;

  const now = Date.now();
  const prev = reassignDebounce.get(jobId) ?? 0;

  if (now - prev < 30000) return;

  reassignDebounce.set(jobId, now);

  void eventBus.emit("ride.reassign.requested", {
    jobId,
    reason: "gps_lost",
    requestedAt: new Date().toISOString(),
  });
}
