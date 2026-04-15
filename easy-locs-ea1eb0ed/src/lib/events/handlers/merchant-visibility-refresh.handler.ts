/**
 * P0 Listener — merchant:visibility_refresh
 * 
 * Owner: Arbitration Brain (visibility truth)
 * 
 * When zone/location changes, this listener refreshes merchant visibility
 * and propagates to consuming surfaces.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { db as supabase } from "@/services/db";

platformBus.on("merchant:visibility_refresh", async (event) => {
  const payload = event.payload as Record<string, any>;
  const zoneKey = payload.zoneKey || payload.zone_key;
  if (!zoneKey) {
    console.warn("[merchant-visibility] No zoneKey in payload, skipping");
    return;
  }

  if (import.meta.env.DEV) console.log(`[merchant-visibility] Refreshing merchant visibility for zone: ${zoneKey}`);

  try {
    const parts = zoneKey.split("_");
    const countryCode = parts[0] || null;
    const city = parts[1] || null;

    const { data: storefronts, error } = await supabase
      .from("storefront_pages")
      .select("id, name, launch_status, active, city, country")
      .eq("launch_status", "launched")
      .limit(100);

    if (error) {
      console.error("[merchant-visibility] Query failed:", error.message);
      return;
    }

    const zoneRelevant = (storefronts || []).filter((s) => {
      if (!city) return true;
      return s.city?.toLowerCase() === city.toLowerCase() ||
             s.country?.toUpperCase() === countryCode?.toUpperCase();
    });

    const liveCount = zoneRelevant.filter((s) => s.active).length;
    const totalCount = zoneRelevant.length;

    platformBus.emit("merchant:visibility_updated", {
      zoneKey,
      totalMerchants: totalCount,
      liveMerchants: liveCount,
      updatedAt: new Date().toISOString(),
    }, "system");

    if (import.meta.env.DEV) console.log(`[merchant-visibility] Zone ${zoneKey}: ${liveCount}/${totalCount} merchants live`);
  } catch (e) {
    console.error("[merchant-visibility] Failed to refresh:", e);
  }
});
