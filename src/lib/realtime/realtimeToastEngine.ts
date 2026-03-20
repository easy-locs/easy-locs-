import { toast } from "sonner";
import { subscribeToTable } from "@/lib/realtime/realtimeEngine";

export function startRealtimeToasts(userId: string) {
  subscribeToTable("notifications", "notifications", (payload) => {
    const row = payload.new;
    if (!row) return;
    if (row.user_id !== userId) return;

    toast(row.title || "New update", {
      description: row.message || "",
    });
  });
}
