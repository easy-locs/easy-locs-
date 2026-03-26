/**
 * P0 Listener — merchant.visibility.refresh
 * 
 * Owner: Arbitration Brain (visibility truth)
 * 
 * When zone/location changes, this listener refreshes merchant visibility
 * and propagates to:
 * - food listings
 * - grocery listings
 * - delivery availability
 * - search serviceability hints
 * - radar merchant layers
 */
import { eventBus } from "@/lib/core/event-bus";
import { supabase } from "@/integrations/supabase/client";

eventBus.on("merchant.visibility.refresh", async (payload) => {
  const zoneKey = payload.zoneKey || payload.zone_key;
  if (!zoneKey) {
    console.warn("[merchant-visibility] No zoneKey in payload, skipping");
    return;
  }

  console.log(`[merchant-visibility] Refreshing merchant visibility for zone: ${zoneKey}`);

  try {
    // Parse zone_key to extract country/city/district
    const parts = zoneKey.split("_");
    const countryCode = parts[0] || null;
    const city = parts[1] || null;

    // Fetch active storefronts in this zone for availability signals
    const { data: storefronts, error } = await supabase
      .from("storefront_pages")
      .select("id, name, launch_status, active, city, country")
      .eq("launch_status", "launched")
      .limit(100);

    if (error) {
      console.error("[merchant-visibility] Query failed:", error.message);
      return;
    }

    // Filter to zone-relevant merchants
    const zoneRelevant = (storefronts || []).filter((s) => {
      if (!city) return true;
      return s.city?.toLowerCase() === city.toLowerCase() ||
             s.country?.toUpperCase() === countryCode?.toUpperCase();
    });

    const liveCount = zoneRelevant.filter((s) => s.active).length;
    const totalCount = zoneRelevant.length;

    // Emit downstream for search serviceability and radar layers
    eventBus.emit("merchant.visibility.updated", {
      zoneKey,
      totalMerchants: totalCount,
      liveMerchants: liveCount,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[merchant-visibility] Zone ${zoneKey}: ${liveCount}/${totalCount} merchants live`);
  } catch (e) {
    console.error("[merchant-visibility] Failed to refresh:", e);
  }
});
