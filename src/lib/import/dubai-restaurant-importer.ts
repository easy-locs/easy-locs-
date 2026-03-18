/**
 * Dubai restaurant auto-importer.
 * Inserts mock restaurant data into merchant_onboarding_profiles + menu_items.
 * Each restaurant is marked as "imported_not_claimed".
 */
import { supabase } from "@/integrations/supabase/client";
import { DUBAI_RESTAURANTS, type DubaiRestaurantSeed } from "./dubai-restaurant-seeds";

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importDubaiRestaurants(workspaceId?: string): Promise<ImportResult> {
  const result: ImportResult = { total: DUBAI_RESTAURANTS.length, imported: 0, skipped: 0, errors: [] };
  const ws = workspaceId ?? null;

  for (const r of DUBAI_RESTAURANTS) {
    try {
      // Check if already imported (by source_external_id)
      const { data: existingSource } = await (supabase as any)
        .from("merchant_onboarding_sources")
        .select("id")
        .eq("source_external_id", r.source_external_id)
        .maybeSingle();

      if (existingSource) {
        result.skipped++;
        continue;
      }

      // 1. Create source record
      const { data: source, error: sourceErr } = await (supabase as any)
        .from("merchant_onboarding_sources")
        .insert({
          source_type: r.source,
          source_name: r.source === "google_maps" ? "Google Maps" : r.source === "deliveroo" ? "Deliveroo" : "Careem",
          source_external_id: r.source_external_id,
          status: "imported",
          workspace_id: ws,
          payload: { city: r.city, area: r.area, cuisine_type: r.cuisine_type },
        })
        .select("id")
        .single();

      if (sourceErr) {
        result.errors.push(`${r.merchant_name} source: ${sourceErr.message}`);
        continue;
      }

      // 2. Create merchant profile
      const { data: merchant, error: merchantErr } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .insert({
          merchant_name: r.merchant_name,
          contact_name: r.contact_name,
          phone: r.phone,
          email: r.email,
          city: r.city,
          area: r.area,
          cuisine_type: r.cuisine_type,
          onboarding_status: "imported_not_claimed",
          activation_mode: "coming_soon",
          source_id: source.id,
          workspace_id: ws,
        })
        .select("id")
        .single();

      if (merchantErr) {
        result.errors.push(`${r.merchant_name} profile: ${merchantErr.message}`);
        continue;
      }

      // 3. Insert menu items
      if (r.menu_items.length > 0) {
        const menuRows = r.menu_items.map((item, idx) => ({
          merchant_profile_id: merchant.id,
          name: item.name,
          price: item.price,
          currency: "AED",
          description: item.description || null,
          is_available: true,
          sort_order: idx,
          workspace_id: ws,
        }));

        const { error: menuErr } = await (supabase as any)
          .from("menu_items")
          .insert(menuRows);

        if (menuErr) {
          result.errors.push(`${r.merchant_name} menu: ${menuErr.message}`);
        }
      }

      result.imported++;
    } catch (err: any) {
      result.errors.push(`${r.merchant_name}: ${err.message}`);
    }
  }

  return result;
}
