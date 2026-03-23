/**
 * UnifiedMapControls — Canonical map control bar.
 * Radius, category filters, view switch, heatmap modes, reset, location.
 */
import { useCallback } from "react";
import {
  MapPin, List, Map, Flame, RotateCcw, Navigation, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import { RADIUS_OPTIONS } from "@/lib/search-engine/search-types";
import { CANONICAL_VERTICALS } from "@/lib/taxonomy/world-class-taxonomy";
import { useLocationStore } from "@/stores/locationStore";

interface UnifiedMapControlsProps {
  className?: string;
  showHeatmap?: boolean;
  showViewSwitch?: boolean;
  showRadius?: boolean;
  showCategories?: boolean;
  compact?: boolean;
}

export default function UnifiedMapControls({
  className,
  showHeatmap = true,
  showViewSwitch = true,
  showRadius = true,
  showCategories = true,
  compact = false,
}: UnifiedMapControlsProps) {
  const state = useUnifiedSearchStore((s) => s.state);
  const setFilters = useUnifiedSearchStore((s) => s.setFilters);
  const setRadius = useUnifiedSearchStore((s) => s.setRadius);
  const setMode = useUnifiedSearchStore((s) => s.setMode);
  const setLocation = useUnifiedSearchStore((s) => s.setLocation);
  const search = useUnifiedSearchStore((s) => s.search);
  const reset = useUnifiedSearchStore((s) => s.reset);
  const currentLocation = useLocationStore((s) => s.currentLocation);

  const handleNearMe = useCallback(() => {
    if (currentLocation) {
      setLocation(currentLocation.lat, currentLocation.lng);
      search();
    }
  }, [currentLocation, setLocation, search]);

  const handleVerticalChange = useCallback((vertical: string) => {
    setFilters({
      vertical: vertical === state.vertical ? "all" : (vertical as any),
      subcategory: undefined,
      cluster: undefined,
    });
    search();
  }, [state.vertical, setFilters, search]);

  const handleRadiusChange = useCallback((km: number) => {
    setRadius(km);
    search();
  }, [setRadius, search]);

  const handleReset = useCallback(() => {
    reset();
    if (currentLocation) {
      setLocation(currentLocation.lat, currentLocation.lng);
    }
    search();
  }, [reset, currentLocation, setLocation, search]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Row 1: View switch + Location + Reset */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {showViewSwitch && (
          <div className="flex rounded-xl bg-muted p-0.5 shrink-0">
            <ControlButton
              active={state.mode === "list"}
              onClick={() => setMode("list")}
              icon={<List className="w-3.5 h-3.5" />}
              label={compact ? undefined : "List"}
            />
            <ControlButton
              active={state.mode === "map"}
              onClick={() => setMode("map")}
              icon={<Map className="w-3.5 h-3.5" />}
              label={compact ? undefined : "Map"}
            />
            {showHeatmap && (
              <ControlButton
                active={state.mode === "heatmap"}
                onClick={() => setMode("heatmap")}
                icon={<Flame className="w-3.5 h-3.5" />}
                label={compact ? undefined : "Heat"}
              />
            )}
          </div>
        )}

        <button
          onClick={handleNearMe}
          className="flex items-center gap-1 rounded-xl bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium shrink-0 active:scale-95 transition-transform"
        >
          <Navigation className="w-3 h-3" />
          {!compact && "Near me"}
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground shrink-0 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-3 h-3" />
          {!compact && "Reset"}
        </button>
      </div>

      {/* Row 2: Radius control */}
      {showRadius && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRadiusChange(opt.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all active:scale-95",
                state.radiusKm === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Row 3: Category chips */}
      {showCategories && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <button
            onClick={() => handleVerticalChange("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all active:scale-95",
              (!state.vertical || state.vertical === "all")
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            )}
          >
            All
          </button>
          {CANONICAL_VERTICALS.map((v) => (
            <button
              key={v.value}
              onClick={() => handleVerticalChange(v.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all active:scale-95",
                state.vertical === v.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Control Button ──
function ControlButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground"
      )}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
