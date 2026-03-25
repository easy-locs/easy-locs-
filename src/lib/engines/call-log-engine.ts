/**
 * Call Log Engine — Maintains call log integrity and cleans stale records.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const STALE_CALL_HOURS = 24;

export async function runCallLogCleanup(limit = 100) {
  const cutoff = new Date(Date.now() - STALE_CALL_HOURS * 3600_000).toISOString();

  // Mark stale ringing/connecting calls as missed
  const { data: stale } = await db
    .from("call_logs")
    .select("id, status")
    .in("status", ["ringing", "connecting"])
    .lt("created_at", cutoff)
    .limit(limit);

  let cleaned = 0;
  for (const call of stale ?? []) {
    await db.from("call_logs").update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", call.id);
    cleaned++;
  }

  return { checked: stale?.length ?? 0, cleaned };
}
