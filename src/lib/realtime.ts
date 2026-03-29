/**
 * realtime.ts — Central realtime channel factory.
 * Single entry point for all Supabase realtime subscriptions.
 * UI/hooks must import from here, never from supabase client directly.
 */
import { supabase } from "@/integrations/supabase/client";

export function createRealtimeChannel(name: string, opts?: any) {
  return supabase.channel(name, opts);
}

export function removeRealtimeChannel(channel: any) {
  return supabase.removeChannel(channel);
}
