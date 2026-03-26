/**
 * P0 Listener — eta.context.refresh
 * 
 * Owner: Execution Brain
 * 
 * When location/zone changes, this listener refreshes ETA projections
 * and propagates updated ETAs to all consuming surfaces:
 * - delivery flows
 * - taxi flows
 * - parcel flows
 * - radar ETA surfaces
 * - search serviceability hints
 */
import { eventBus } from "@/lib/core/event-bus";
import { getZoneOverlay } from "@/lib/radar/radar-place-search-adapter";
import { overlayToStation, projectETAs } from "@/lib/radar/eta-projection-engine";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";

eventBus.on("eta.context.refresh", async (payload) => {
  const zoneKey = payload.zoneKey || payload.zone_key;
  if (!zoneKey) {
    console.warn("[eta-refresh] No zoneKey in payload, skipping");
    return;
  }

  console.log(`[eta-refresh] Refreshing ETA for zone: ${zoneKey}`);

  try {
    const overlay = await getZoneOverlay(zoneKey);
    if (!overlay) {
      console.warn(`[eta-refresh] No overlay found for zone: ${zoneKey}`);
      return;
    }

    const station = overlayToStation(overlay);
    const etas = projectETAs(station);

    // Propagate to radarPlaceStore so all surfaces get fresh ETAs
    const store = useRadarPlaceStore.getState();
    store.setZoneOverlay(overlay);

    // Emit downstream events for domain-specific consumers
    eventBus.emit("eta.projections.updated", {
      zoneKey,
      etas,
      station,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[eta-refresh] ETA updated for ${zoneKey}:`, {
      food: etas.food ? `${etas.food}min` : "n/a",
      taxi: etas.taxi ? `${etas.taxi}min` : "n/a",
      grocery: etas.grocery ? `${etas.grocery}min` : "n/a",
      parcel: etas.parcel ? `${etas.parcel}min` : "n/a",
    });
  } catch (e) {
    console.error("[eta-refresh] Failed to refresh ETA:", e);
  }
});
