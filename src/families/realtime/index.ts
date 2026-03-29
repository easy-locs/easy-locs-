/**
 * FAMILY: REALTIME — Canonical realtime subscription management for the entire app.
 * Single source of truth. All modules must use this family for subscriptions.
 */

// ── Re-export canonical channel factory ──
export {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/realtime";

/**
 * Subscribe to postgres changes on a table.
 * Returns a cleanup function.
 */
export function subscribeToTable(opts: {
  channelName: string;
  table: string;
  schema?: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  onPayload: (payload: any) => void;
}): () => void {
  const { createRealtimeChannel, removeRealtimeChannel } = require("@/lib/realtime");
  const channel = createRealtimeChannel(opts.channelName)
    .on(
      "postgres_changes",
      {
        event: opts.event || "*",
        schema: opts.schema || "public",
        table: opts.table,
        ...(opts.filter ? { filter: opts.filter } : {}),
      },
      opts.onPayload
    )
    .subscribe();

  return () => {
    removeRealtimeChannel(channel);
  };
}

/**
 * Subscribe to a broadcast channel.
 * Returns a cleanup function.
 */
export function subscribeToBroadcast(opts: {
  channelName: string;
  event: string;
  onPayload: (payload: any) => void;
}): () => void {
  const { createRealtimeChannel, removeRealtimeChannel } = require("@/lib/realtime");
  const channel = createRealtimeChannel(opts.channelName)
    .on("broadcast", { event: opts.event }, opts.onPayload)
    .subscribe();

  return () => {
    removeRealtimeChannel(channel);
  };
}
