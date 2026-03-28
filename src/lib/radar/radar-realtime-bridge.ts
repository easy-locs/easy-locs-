/**
 * radar-realtime-bridge — Atomic unit: subscribe to live driver/order position updates.
 * Single responsibility: realtime sync for radar map.
 */
import { supabase } from "@/integrations/supabase/client";
import { registerChannel, recordEvent, unregisterChannel } from "@/lib/runtime/realtime-monitor";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const CHANNEL_NAME = "radar-presence";

export function subscribeRadarPresence(onUpdate: (payload: any) => void): () => void {
  registerChannel(CHANNEL_NAME, "radar");

  const channel = supabase
    .channel("radar-driver-presence")
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "rider_presence" },
      (payload: any) => {
        recordEvent(CHANNEL_NAME);
        reportHealth("radar", "ok");
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    unregisterChannel(CHANNEL_NAME);
    supabase.removeChannel(channel);
  };
}

export function subscribeRadarJobs(onUpdate: (payload: any) => void): () => void {
  const channelName = "radar-jobs";
  registerChannel(channelName, "radar");

  const channel = supabase
    .channel("radar-mobility-jobs")
    .on(
      "postgres_changes" as any,
      { event: "UPDATE", schema: "public", table: "mobility_jobs" },
      (payload: any) => {
        recordEvent(channelName);
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    unregisterChannel(channelName);
    supabase.removeChannel(channel);
  };
}
