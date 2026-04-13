import { db as supabase } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

type Callback = (payload: any) => void;

const channels: Record<string, any> = {};

export function subscribeToTable(
  key: string,
  table: string,
  callback: Callback
) {
  if (channels[key]) return;

  const channel = supabase
    .channel(`rt-${key}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  channels[key] = channel;
}

export function unsubscribeFromTable(key: string) {
  const channel = channels[key];
  if (!channel) return;

  removeRealtimeChannel(channel);
  delete channels[key];
}
