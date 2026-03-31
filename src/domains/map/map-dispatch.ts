/**
 * mapDispatch — Single entry for all map intents.
 */

export type MapCommand =
  | { type: "update_viewport"; lat: number; lng: number; zoom?: number }
  | { type: "select_entity"; entityId: string | null }
  | { type: "set_entities"; entities: any[] }
  | { type: "toggle_layer"; layer: "heatmap" | "mobility" | "radius" }
  | { type: "set_mode"; mode: string };

export interface MapCommandResult {
  ok: boolean;
  error?: string;
}

export async function mapDispatch(cmd: MapCommand): Promise<MapCommandResult> {
  try {
    const { useSuperMapStore } = await import("@/stores/superMapStore");
    const store = useSuperMapStore.getState();

    switch (cmd.type) {
      case "update_viewport":
        store.setCenter(cmd.lat, cmd.lng);
        if (cmd.zoom) store.setZoom(cmd.zoom);
        return { ok: true };

      case "select_entity":
        store.selectEntity(cmd.entityId);
        return { ok: true };

      case "set_entities":
        store.setEntities(cmd.entities);
        return { ok: true };

      case "toggle_layer":
        if (cmd.layer === "heatmap") store.toggleHeatmap();
        else if (cmd.layer === "mobility") store.toggleMobility();
        else if (cmd.layer === "radius") store.toggleRadius();
        return { ok: true };

      case "set_mode":
        store.setMode(cmd.mode as any);
        return { ok: true };

      default:
        return { ok: false, error: "unknown_map_command" };
    }
  } catch (err: any) {
    console.error("[mapDispatch]", err);
    return { ok: false, error: err?.message || "map_dispatch_error" };
  }
}
