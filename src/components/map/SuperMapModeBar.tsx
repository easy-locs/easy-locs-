/**
 * SuperMapModeBar — Floating mode switcher for SuperMap.
 */
import { cn } from "@/lib/utils";
import { useSuperMapStore } from "@/stores/superMapStore";
import type { SuperMapMode } from "@/lib/map/superMapLayers";
import {
  Compass, Car, UtensilsCrossed, ShoppingBag,
  Hotel, Building, Wrench, Wallet, Radio, CloudRain,
} from "lucide-react";

const MODES: { value: SuperMapMode; label: string; icon: React.ElementType }[] = [
  { value: "explore", label: "Explore", icon: Compass },
  { value: "mobility", label: "Mobility", icon: Car },
  { value: "food", label: "Food", icon: UtensilsCrossed },
  { value: "retail", label: "Retail", icon: ShoppingBag },
  { value: "stay", label: "Stay", icon: Hotel },
  { value: "property", label: "Property", icon: Building },
  { value: "services", label: "Services", icon: Wrench },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "radar", label: "Radar", icon: Radio },
];

export default function SuperMapModeBar() {
  const mode = useSuperMapStore((s) => s.mode);
  const setMode = useSuperMapStore((s) => s.setMode);
  const showWeather = useSuperMapStore((s) => s.showWeather);
  const toggleWeather = useSuperMapStore((s) => s.toggleWeather);

  return (
    <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95",
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card/80 backdrop-blur-md text-muted-foreground border border-border/20 hover:bg-card"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={toggleWeather}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold shadow-sm backdrop-blur-md transition-all active:scale-95",
            showWeather
              ? "border-primary/30 bg-primary text-primary-foreground"
              : "border-border/20 bg-card/80 text-muted-foreground"
          )}
        >
          <CloudRain className="h-3.5 w-3.5 shrink-0" />
          Rain radar
        </button>
      </div>
    </div>
  );
}
