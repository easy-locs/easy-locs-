/**
 * realtime.ts — Central realtime channel factory.
 * Single entry point for all Supabase realtime subscriptions.
 * UI/hooks must import from here, never from supabase client directly.
 */
import { db as supabase } from "@/services/db";

export function createRealtimeChannel(name: string, opts?: any) {
  return supabase.channel(name, opts);
}

export function removeRealtimeChannel(channel: any) {
  return supabase.removeChannel(channel);
}
