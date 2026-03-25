/**
 * Source Intake Engine — Scans for raw shop data from imports/CSV/web
 * and stores complete source snapshots before any normalization.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runSourceIntakeScan(limit = 50) {
  // Find seed_merchants with no source_snapshot yet
  const { data: raw } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, description, phone, cover_image, logo_image, menu_items_json, latitude, longitude, city, country, source_type, source_url")
    .is("source_snapshot_at", null)
    .limit(limit);

  let snapshotted = 0;
  for (const m of raw ?? []) {
    const snapshot = {
      name: m.name,
      category: m.category,
      subcategory: m.subcategory,
      description: m.description,
      phone: m.phone,
      cover_image: m.cover_image,
      logo_image: m.logo_image,
      menu_items_json: m.menu_items_json,
      latitude: m.latitude,
      longitude: m.longitude,
      city: m.city,
      country: m.country,
      source_type: m.source_type,
      source_url: m.source_url,
    };

    await db.from("seed_merchants").update({
      source_snapshot_json: snapshot,
      source_snapshot_at: new Date().toISOString(),
    }).eq("id", m.id);
    snapshotted++;
  }

  return { scanned: raw?.length ?? 0, snapshotted };
}
