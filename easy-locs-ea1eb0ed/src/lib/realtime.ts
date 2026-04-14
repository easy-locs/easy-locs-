/**
 * realtime.ts — Central realtime channel factory with hardened connections.
 * Single entry point for all Supabase realtime subscriptions.
 * UI/hooks must import from here, never from supabase client directly.
 *
 * Integrates with realtime-hardener for automatic reconnection,
 * heartbeat monitoring, zombie detection, and latency tracking.
 */
import { db as supabase } from "@/services/db";
import { realtimeHardener, trackRealtimeEvent } from "@/lib/infrastructure/realtime-hardener";

export function createRealtimeChannel(name: string, opts?: any) {
  return supabase.channel(name, opts);
}

export function createHardenedChannel(
  name: string,
  module: string,
  setupFn: (channel: ReturnType<typeof supabase.channel>) => ReturnType<typeof supabase.channel>,
): void {
  realtimeHardener.createChannel(name, module, setupFn);
}

export function removeRealtimeChannel(channel: any) {
  return supabase.removeChannel(channel);
}

export function removeHardenedChannel(name: string): void {
  realtimeHardener.destroyChannel(name);
}

export { trackRealtimeEvent };
