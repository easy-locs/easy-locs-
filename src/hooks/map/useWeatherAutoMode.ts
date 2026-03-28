/**
 * useWeatherAutoMode — Adapts weather display based on real conditions + device.
 * Weather data is ALWAYS active. This only adjusts visual display.
 */
import { useEffect } from "react";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import type { WeatherOverlayLevel, WeatherEffectsLevel } from "@/stores/weatherDisplayStore";

interface WeatherConditions {
  isRaining: boolean;
  precipitationMm: number;
  windKmh: number | null;
}

const IS_MOBILE = typeof window !== "undefined" && window.innerWidth < 768;

export function useWeatherAutoMode(conditions: WeatherConditions) {
  const autoMode = useWeatherDisplayStore((s) => s.autoMode);
  const applyAutoDisplay = useWeatherDisplayStore((s) => s.applyAutoDisplay);

  useEffect(() => {
    if (!autoMode) return;

    let radar: WeatherOverlayLevel = "off";
    let effects: WeatherEffectsLevel = "off";

    if (conditions.isRaining) {
      const heavy = conditions.precipitationMm > 5;
      const moderate = conditions.precipitationMm > 1;

      // Radar: always show when raining
      radar = IS_MOBILE && !heavy ? "minimal" : "full";

      // Effects: scale with intensity, reduce on mobile
      if (heavy) {
        effects = IS_MOBILE ? "subtle" : "immersive";
      } else if (moderate) {
        effects = "subtle";
      } else {
        effects = IS_MOBILE ? "off" : "subtle";
      }
    }

    // High wind without rain — still show minimal
    if (!conditions.isRaining && conditions.windKmh && conditions.windKmh > 40) {
      radar = "minimal";
    }

    applyAutoDisplay(radar, effects);
  }, [autoMode, conditions.isRaining, conditions.precipitationMm, conditions.windKmh, applyAutoDisplay]);
}
