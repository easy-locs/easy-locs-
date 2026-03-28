/**
 * SuperMap — Thin UI shell. All logic delegated to hooks.
 * Zero business logic. Zero inline animations. Zero inline data sync.
 */
import { useRef, memo } from "react";
import { useSuperMapStore } from "@/stores/superMapStore";
import { useMapCore } from "@/hooks/map/useMapCore";
import { useMapDataSync } from "@/hooks/map/useMapDataSync";
import { useMapInteractions } from "@/hooks/map/useMapInteractions";
import { useMapWeather } from "@/hooks/map/useMapWeather";
import { useMapCamera } from "@/hooks/map/useMapCamera";
import { useMapAnimations } from "@/hooks/map/useMapAnimations";
import { useMapPreset } from "@/hooks/map/useMapPreset";
import { useMapAdaptive } from "@/hooks/map/useMapAdaptive";
import SuperMapModeBar from "@/components/map/SuperMapModeBar";
import MapControls from "@/components/map/MapControls";
import MapCockpit from "@/components/map/MapCockpit";
import { CloudRain, CloudSun } from "lucide-react";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

interface SuperMapProps {
  className?: string;
  showModeBar?: boolean;
  onSelectEntity?: (entity: GeoEntity) => void;
  onZoneClick?: (lat: number, lng: number) => void;
}

export default memo(function SuperMap({
  className = "",
  showModeBar = true,
  onSelectEntity,
  onZoneClick,
}: SuperMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const centerLat = useSuperMapStore(s => s.centerLat);
  const centerLng = useSuperMapStore(s => s.centerLng);
  const zoom = useSuperMapStore(s => s.zoom);
  const entities = useSuperMapStore(s => s.entities);
  const showHeatmap = useSuperMapStore(s => s.showHeatmap);
  const showWeather = useSuperMapStore(s => s.showWeather);
  const showStations = useSuperMapStore(s => s.showStations);
  const showMobility = useSuperMapStore(s => s.showMobility);
  const toggleHeatmap = useSuperMapStore(s => s.toggleHeatmap);
  const toggleWeather = useSuperMapStore(s => s.toggleWeather);
  const toggleStations = useSuperMapStore(s => s.toggleStations);
  const toggleMobility = useSuperMapStore(s => s.toggleMobility);

  // ── Preset resolution ──
  const preset = useMapPreset();

  // ── 1. MapCore: init + lifecycle ──
  const { mapRef, ready } = useMapCore(containerRef, { centerLng, centerLat, zoom });

  // ── 2. Data sync: store → map sources ──
  useMapDataSync(mapRef, ready);

  // ── 3. Interactions: click/hover/popup ──
  useMapInteractions(mapRef, ready, { onSelectEntity, onZoneClick, entities });

  // ── 4. Weather: fog/rain/stations ──
  const { weather } = useMapWeather(mapRef, ready);

  // ── 5. Camera: fit bounds + recenter ──
  const { recenter } = useMapCamera(mapRef, ready);

  // ── 6. Animations: wired to preset config ──
  useMapAnimations(mapRef, ready, preset);

  // ── 7. Adaptive intelligence ──
  const { adaptive } = useMapAdaptive(mapRef, ready, entities.length);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />

      {/* Weather badge */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-3">
        <div className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/40 bg-card/85 px-3 py-2 shadow-sm backdrop-blur-md">
          {weather.isRaining
            ? <CloudRain className="h-4 w-4 shrink-0 text-primary" />
            : <CloudSun className="h-4 w-4 shrink-0 text-primary" />}
          <span className="truncate text-[11px] font-medium text-foreground">Live station · {weather.label}</span>
        </div>
      </div>

      {/* Rain overlays */}
      {weather.isRaining && (
        <>
          <div className="map-rain-tint pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="map-rain-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="map-rain-glow pointer-events-none absolute inset-0 rounded-2xl" />
        </>
      )}

      {/* Controls */}
      <div className="absolute bottom-3 right-3 z-30 flex max-w-[calc(100%-1.5rem)] justify-end">
        <MapControls
          showWeather={showWeather || weather.isRaining}
          showStations={showStations}
          showMobility={showMobility}
          showHeatmap={showHeatmap}
          onToggleWeather={toggleWeather}
          onToggleStations={toggleStations}
          onToggleMobility={toggleMobility}
          onToggleHeatmap={toggleHeatmap}
          onRecenter={recenter}
        />
      </div>

      {/* Cockpit */}
      <div className="absolute bottom-3 left-3 z-30">
        <MapCockpit adaptive={adaptive} presetLabel={preset.label} />
      </div>

      {showModeBar && <SuperMapModeBar />}
    </div>
  );
});
