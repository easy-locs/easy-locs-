/**
 * Source Rescrape Monitor — Flags stale shops that need re-enrichment.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const STALE_DAYS = 30;

export async function runSourceRescrapeMonitor(limit = 100) {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString();

  const { data: stale } = await db
    .from("seed_merchants")
    .select("id, source_snapshot_at, source_url")
    .not("source_snapshot_at", "is", null)
    .lt("source_snapshot_at", cutoff)
    .limit(limit);

  let flagged = 0;
  for (const s of stale ?? []) {
    await db.from("seed_merchants").update({
      needs_rescrape: true,
    }).eq("id", s.id);
    flagged++;
  }

  console.log(`[source-rescrape-monitor] flagged=${flagged} stale sources`);
  return { flagged, total: stale?.length ?? 0 };
}
