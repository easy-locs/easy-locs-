/**
 * P0 Listener — eta:context_refresh
 * 
 * Owner: Execution Brain
 * 
 * When location/zone changes, this listener refreshes ETA projections
 * and propagates updated ETAs to all consuming surfaces.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { getZoneOverlay } from "@/lib/radar/radar-place-search-adapter";
import { overlayToStation, projectETAs } from "@/lib/radar/eta-projection-engine";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";

platformBus.on("eta:context_refresh", async (event) => {
  const payload = event.payload as Record<string, any>;
  const zoneKey = payload.zoneKey || payload.zone_key;
  if (!zoneKey) {
    console.warn("[eta-refresh] No zoneKey in payload, skipping");
    return;
  }

  if (import.meta.env.DEV) console.log(`[eta-refresh] Refreshing ETA for zone: ${zoneKey}`);

  try {
    const overlay = await getZoneOverlay(zoneKey);
    if (!overlay) {
      console.warn(`[eta-refresh] No overlay found for zone: ${zoneKey}`);
      return;
    }

    const station = overlayToStation(overlay);
    const etas = projectETAs(station);

    const store = useRadarPlaceStore.getState();
    store.setZoneOverlay(overlay);

    platformBus.emit("eta:projections_updated", {
      zoneKey,
      etas,
      station,
      updatedAt: new Date().toISOString(),
    }, "system");

    if (import.meta.env.DEV) console.log(`[eta-refresh] ETA updated for ${zoneKey}:`, {
      food: etas.food ? `${etas.food}min` : "n/a",
      taxi: etas.taxi ? `${etas.taxi}min` : "n/a",
      grocery: etas.grocery ? `${etas.grocery}min` : "n/a",
      parcel: etas.parcel ? `${etas.parcel}min` : "n/a",
    });
  } catch (e) {
    console.error("[eta-refresh] Failed to refresh ETA:", e);
  }
});
