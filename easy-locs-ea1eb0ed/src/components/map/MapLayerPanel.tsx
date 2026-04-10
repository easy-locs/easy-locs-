/**
 * MapLayerPanel — Premium compact layer control with 3 presets.
 */
import { useMapLayersStore } from "@/stores/useMapLayersStore";
import type { UnifiedMapLayerFlags } from "@/types/map";
import { cn } from "@/lib/utils";
import { Layers, Zap, Eye } from "lucide-react";

const QUICK_TOGGLES: { key: keyof UnifiedMapLayerFlags; emoji: string; label: string }[] = [
  { key: "restaurants", emoji: "🍕", label: "Food" },
  { key: "grocery", emoji: "🛒", label: "Grocery" },
  { key: "hotels", emoji: "🏨", label: "Hotels" },
  { key: "properties", emoji: "🏠", label: "Property" },
  { key: "services", emoji: "🛠️", label: "Services" },
  { key: "drivers", emoji: "🛵", label: "Drivers" },
  { key: "labels", emoji: "🏷️", label: "Labels" },
  { key: "heatmap", emoji: "🔥", label: "Heat" },
  { key: "weather", emoji: "🌧️", label: "Weather" },
  { key: "rainRadar", emoji: "📡", label: "Radar" },
  { key: "routes", emoji: "🛤️", label: "Routes" },
  { key: "zones", emoji: "🔷", label: "Zones" },
];

export function MapLayerPanel({ className }: { className?: string }) {
  const layers = useMapLayersStore((s) => s.layers);
  const activePreset = useMapLayersStore((s) => s.activePreset);
  const toggle = useMapLayersStore((s) => s.toggle);
  const enableClean = useMapLayersStore((s) => s.enableClean);
  const enableLiveRadar = useMapLayersStore((s) => s.enableLiveRadar);
  const enableDeliveryOps = useMapLayersStore((s) => s.enableDeliveryOps);

  const presets = [
    { id: "clean" as const, label: "Clean", icon: Eye, fn: enableClean },
    { id: "liveRadar" as const, label: "Radar", icon: Zap, fn: enableLiveRadar },
    { id: "deliveryOps" as const, label: "Ops", icon: Layers, fn: enableDeliveryOps },
  ];

  return (
    <div className={cn(
      "rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-xl p-2.5 shadow-2xl",
      className,
    )}>
      {/* Presets */}
      <div className="flex gap-1 mb-2">
        {presets.map(({ id, label, icon: Icon, fn }) => (
          <button
            key={id}
            onClick={fn}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold tracking-wide uppercase transition-all duration-200",
              activePreset === id
                ? "bg-white/10 text-white shadow-inner"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Quick toggles */}
      <div className="grid grid-cols-3 gap-1">
        {QUICK_TOGGLES.map(({ key, emoji, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={cn(
              "flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium transition-all duration-200",
              layers[key]
                ? "bg-white/10 text-white/90"
                : "text-white/25 hover:text-white/50 hover:bg-white/[0.03]",
            )}
          >
            <span className="text-xs">{emoji}</span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
