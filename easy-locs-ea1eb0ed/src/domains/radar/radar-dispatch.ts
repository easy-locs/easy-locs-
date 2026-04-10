/**
 * radarDispatch — Single entry for all radar intents.
 */

export type RadarCommand =
  | { type: "refresh_feed" }
  | { type: "set_category"; category: string }
  | { type: "set_subcategory"; subcategory: string | null }
  | { type: "set_sort"; mode: string }
  | { type: "set_location"; lat: number; lng: number }
  | { type: "toggle_map" };

export interface RadarCommandResult {
  ok: boolean;
  error?: string;
}

export async function radarDispatch(cmd: RadarCommand): Promise<RadarCommandResult> {
  try {
    const { useRadarStore } = await import("@/stores/radarStore");
    const store = useRadarStore.getState();

    switch (cmd.type) {
      case "refresh_feed":
        store.refreshFiltered();
        return { ok: true };

      case "set_category":
        store.setCategory(cmd.category as any);
        return { ok: true };

      case "set_subcategory":
        store.setSubCategory(cmd.subcategory as any);
        return { ok: true };

      case "set_sort":
        store.setSortMode(cmd.mode as any);
        return { ok: true };

      case "set_location":
        store.setUserLocation({ lat: cmd.lat, lng: cmd.lng });
        return { ok: true };

      case "toggle_map":
        store.setMapMode(store.mapMode === "list" ? "map" : "list");
        return { ok: true };

      default:
        return { ok: false, error: "unknown_radar_command" };
    }
  } catch (err: any) {
    console.error("[radarDispatch]", err);
    return { ok: false, error: err?.message || "radar_dispatch_error" };
  }
}
