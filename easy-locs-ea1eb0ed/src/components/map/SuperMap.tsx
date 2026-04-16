/**
 * SuperMap — Thin UI shell. All logic delegated to hooks.
 * Zero business logic. Zero inline animations. Zero inline data sync.
 * Uses unified mapStore.
 */
import { useRef, memo, useEffect, useState, useCallback } from "react";
import { useUnifiedMapStore } from "@/stores/mapStore";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { useMapCore } from "@/hooks/map/useMapCore";
import { useNetworkRecovery } from "@/hooks/map/useNetworkRecovery";
import { useMapDataSync } from "@/hooks/map/useMapDataSync";
import { useMapInteractions } from "@/hooks/map/useMapInteractions";
import { useMapWeather } from "@/hooks/map/useMapWeather";
import { useMapCamera } from "@/hooks/map/useMapCamera";
import { useMapAnimations } from "@/hooks/map/useMapAnimations";
import { useMapPreset } from "@/hooks/map/useMapPreset";
import { useMapAdaptive } from "@/hooks/map/useMapAdaptive";
import { useMapRetry } from "@/hooks/map/useMapRetry";
import SuperMapModeBar from "@/components/map/SuperMapModeBar";
import MapControls from "@/components/map/MapControls";
import MapCockpit from "@/components/map/MapCockpit";
import MapErrorFallback from "@/components/map/MapErrorFallback";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { CloudRain, CloudSun } from "lucide-react";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

interface SuperMapProps {
  className?: string;
  showModeBar?: boolean;
  onSelectEntity?: (entity: GeoEntity) => void;
  onZoneClick?: (lat: number, lng: number) => void;
}

interface SuperMapInnerProps extends SuperMapProps {
  onError?: (msg: string) => void;
  onSuccess?: () => void;
  onNetworkOffline?: (offline: boolean) => void;
}

function SuperMapInner({
  className = "",
  showModeBar = true,
  onSelectEntity,
  onZoneClick,
  onError,
  onSuccess,
  onNetworkOffline,
}: SuperMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const centerLat = useUnifiedMapStore(s => s.viewport.centerLat);
  const centerLng = useUnifiedMapStore(s => s.viewport.centerLng);
  const zoom = useUnifiedMapStore(s => s.viewport.zoom);
  const entities = useUnifiedMapStore(s => s.entities);

  const effectsLevel = useWeatherDisplayStore(s => s.effectsLevel);

  const preset = useMapPreset();

  const { mapRef, ready, error: mapError } = useMapCore(containerRef, { centerLng, centerLat, zoom });

  const { isOffline } = useNetworkRecovery({
    enabled: !!mapError,
    onReconnect: () => {},
  });

  useMapDataSync(mapRef, ready);
  useMapInteractions(mapRef, ready, { onSelectEntity, onZoneClick, entities });
  const { weather } = useMapWeather(mapRef, ready);
  const { recenter } = useMapCamera(mapRef, ready);
  useMapAnimations(mapRef, ready, preset);
  const { adaptive } = useMapAdaptive(mapRef, ready, entities.length);

  useEffect(() => {
    if (mapError) onError?.(mapError);
  }, [mapError, onError]);

  useEffect(() => {
    if (ready) onSuccess?.();
  }, [ready, onSuccess]);

  useEffect(() => {
    onNetworkOffline?.(isOffline);
  }, [isOffline, onNetworkOffline]);

  const showRainEffects = weather.isRaining && effectsLevel !== "off";

  if (mapError) {
    return null;
  }

  if (!ready) {
    return (
      <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
        <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none" style={{ background: "hsl(var(--card) / 0.6)" }}>
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--primary) / 0.3)", borderTopColor: "hsl(var(--primary))" }} />
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary fallbackHeight="100%">
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-3">
        <div className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/40 bg-card/85 px-3 py-2 shadow-sm backdrop-blur-md">
          {weather.isRaining
            ? <CloudRain className="h-4 w-4 shrink-0 text-primary" />
            : <CloudSun className="h-4 w-4 shrink-0 text-primary" />}
          <span className="truncate text-[0.6875rem] font-medium text-foreground">
            {weather.label}
          </span>
        </div>
      </div>

      {showRainEffects && (
        <>
          <div className="map-rain-tint pointer-events-none absolute inset-0 rounded-2xl" />
          {effectsLevel === "immersive" && (
            <>
              <div className="map-rain-overlay pointer-events-none absolute inset-0 rounded-2xl" />
              <div className="map-rain-glow pointer-events-none absolute inset-0 rounded-2xl" />
            </>
          )}
        </>
      )}

      <div className="absolute bottom-3 right-3 z-30 flex max-w-[calc(100%-1.5rem)] justify-end">
        <MapControls onRecenter={recenter} />
      </div>

      <div className="absolute bottom-3 left-3 z-30">
        <MapCockpit adaptive={adaptive} presetLabel={preset.label} />
      </div>

      {showModeBar && <SuperMapModeBar />}
    </div>
    </MapErrorBoundary>
  );
}

export default memo(function SuperMap({
  className = "",
  showModeBar = true,
  onSelectEntity,
  onZoneClick,
}: SuperMapProps) {
  const retry = useMapRetry();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const handleError = useCallback((msg: string) => {
    setErrorMessage(msg);
  }, []);

  const handleSuccess = useCallback(() => {
    setErrorMessage(null);
    setIsOffline(false);
    retry.reset();
  }, [retry.reset]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    retry.triggerRetry();
  }, [retry.triggerRetry]);

  const handleNetworkOffline = useCallback((offline: boolean) => {
    setIsOffline(offline);
    if (!offline && errorMessage) {
      handleRetry();
    }
  }, [errorMessage, handleRetry]);

  if (errorMessage) {
    return (
      <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
        <MapErrorFallback
          message={errorMessage}
          className="w-full h-full"
          onRetry={handleRetry}
          isOffline={isOffline}
          isOnCooldown={retry.isOnCooldown}
          cooldownRemaining={retry.cooldownRemaining}
          retryCount={retry.retryCount}
          maxRetries={retry.maxRetries}
          exhausted={retry.exhausted}
        />
      </div>
    );
  }

  return (
    <SuperMapInner
      key={retry.retryKey}
      className={className}
      showModeBar={showModeBar}
      onSelectEntity={onSelectEntity}
      onZoneClick={onZoneClick}
      onError={handleError}
      onSuccess={handleSuccess}
      onNetworkOffline={handleNetworkOffline}
    />
  );
});
