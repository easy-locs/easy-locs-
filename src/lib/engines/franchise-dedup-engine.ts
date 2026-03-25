/**
 * Franchise / Brand Dedup Engine — Detects and flags duplicate brand entries.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runFranchiseDedup(limit = 200) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, latitude, longitude, phone, source")
    .not("name", "is", null)
    .limit(limit);

  if (!merchants?.length) return { checked: 0, duplicates: 0, flagged: 0 };

  const nameMap = new Map<string, any[]>();
  for (const m of merchants) {
    const key = (m.name ?? "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(m);
  }

  let duplicates = 0, flagged = 0;
  for (const [, group] of nameMap) {
    if (group.length <= 1) continue;
    duplicates += group.length - 1;

    // Check if same GPS (within ~150m)
    for (let i = 1; i < group.length; i++) {
      const a = group[0], b = group[i];
      if (a.latitude && b.latitude) {
        const dist = Math.sqrt(Math.pow((a.latitude - b.latitude) * 111000, 2) + Math.pow((a.longitude - b.longitude) * 111000 * Math.cos(a.latitude * Math.PI / 180), 2));
        if (dist < 150 && a.phone === b.phone) {
          await db.from("seed_merchants").update({ dedup_status: "duplicate_flagged" }).eq("id", b.id);
          flagged++;
        }
      }
    }
  }

  return { checked: merchants.length, duplicates, flagged };
}
