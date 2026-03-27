/**
 * MapLayerPanel — Toggle panel for canonical map layers with presets.
 */
import { useMapLayersStore } from "@/stores/useMapLayersStore";
import type { UnifiedMapLayerFlags } from "@/types/map";
import { cn } from "@/lib/utils";

const LAYER_KEYS: { key: keyof UnifiedMapLayerFlags; label: string; emoji: string }[] = [
  { key: "userLocation", label: "My Location", emoji: "📍" },
  { key: "restaurants", label: "Restaurants", emoji: "🍕" },
  { key: "grocery", label: "Grocery", emoji: "🛒" },
  { key: "hotels", label: "Hotels", emoji: "🏨" },
  { key: "properties", label: "Properties", emoji: "🏠" },
  { key: "services", label: "Services", emoji: "🛠️" },
  { key: "drivers", label: "Drivers", emoji: "🛵" },
  { key: "orders", label: "Orders", emoji: "🧾" },
  { key: "pickups", label: "Pickups", emoji: "📦" },
  { key: "dropoffs", label: "Dropoffs", emoji: "📍" },
  { key: "warehouses", label: "Warehouses", emoji: "🏬" },
  { key: "clusters", label: "Clusters", emoji: "⚪" },
  { key: "labels", label: "Labels", emoji: "🏷️" },
  { key: "heatmap", label: "Heatmap", emoji: "🔥" },
  { key: "routes", label: "Routes", emoji: "🛤️" },
  { key: "zones", label: "Zones", emoji: "🔷" },
  { key: "radius", label: "Radius", emoji: "⭕" },
  { key: "selectedHighlight", label: "Selection", emoji: "✨" },
  { key: "weather", label: "Weather", emoji: "🌤️" },
  { key: "rainRadar", label: "Rain Radar", emoji: "🌧️" },
  { key: "traffic", label: "Traffic", emoji: "🚗" },
];

export function MapLayerPanel({ className }: { className?: string }) {
  const layers = useMapLayersStore((s) => s.layers);
  const toggle = useMapLayersStore((s) => s.toggle);
  const reset = useMapLayersStore((s) => s.reset);
  const enableBusinessOnly = useMapLayersStore((s) => s.enableBusinessOnly);
  const enableDeliveryOps = useMapLayersStore((s) => s.enableDeliveryOps);
  const enableFullRadar = useMapLayersStore((s) => s.enableFullRadar);

  return (
    <div className={cn("rounded-2xl border border-border/20 bg-card/95 backdrop-blur-md p-3 shadow-lg", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Map Layers</h3>
        <button onClick={reset} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
          Reset
        </button>
      </div>

      {/* Presets */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[
          { label: "Business", fn: enableBusinessOnly },
          { label: "Delivery", fn: enableDeliveryOps },
          { label: "Full Radar", fn: enableFullRadar },
        ].map(({ label, fn }) => (
          <button
            key={label}
            onClick={fn}
            className="rounded-full border border-border/20 bg-muted/40 px-2.5 py-1 text-[10px] font-semibold text-foreground hover:bg-primary/10 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toggle grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[50vh] overflow-y-auto scrollbar-none">
        {LAYER_KEYS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all",
              layers[key]
                ? "bg-primary/15 text-primary border border-primary/20"
                : "bg-muted/20 text-muted-foreground border border-transparent",
            )}
          >
            <span className="text-sm">{emoji}</span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
