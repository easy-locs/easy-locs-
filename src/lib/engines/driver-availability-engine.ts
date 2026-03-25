/**
 * Driver Availability Engine — Monitors driver online/offline status.
 * Auto-marks drivers offline after inactivity. Tracks availability metrics.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const OFFLINE_THRESHOLD_MIN = 30;

export async function runDriverAvailabilityScan(limit = 100) {
  const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MIN * 60_000).toISOString();

  // Find stale online drivers
  const { data: stale } = await db
    .from("driver_profiles")
    .select("id, user_id, is_online, last_seen_at")
    .eq("is_online", true)
    .lt("last_seen_at", cutoff)
    .limit(limit);

  let markedOffline = 0;
  for (const d of stale ?? []) {
    await db.from("driver_profiles").update({ is_online: false, is_available: false }).eq("id", d.id);
    markedOffline++;
  }

  // Count available drivers
  const { count: onlineCount } = await db
    .from("driver_profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_online", true)
    .eq("is_available", true);

  return { scanned: (stale?.length ?? 0), markedOffline, onlineDrivers: onlineCount ?? 0 };
}
