import { useEffect } from "react";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import type { WeatherOverlayLevel, WeatherEffectsLevel } from "@/stores/weatherDisplayStore";

interface WeatherConditions {
  isRaining: boolean;
  precipitationMm: number;
  windKmh: number | null;
  weatherCode?: number | null;
  isDay?: boolean;
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

      radar = IS_MOBILE && !heavy ? "minimal" : "full";

      if (heavy) {
        effects = IS_MOBILE ? "subtle" : "immersive";
      } else if (moderate) {
        effects = "subtle";
      } else {
        effects = IS_MOBILE ? "off" : "subtle";
      }
    }

    const code = conditions.weatherCode ?? null;
    const isSnow = code !== null && code >= 71 && code <= 77;
    const isFog = code !== null && code >= 45 && code <= 48;
    const isSunny = !conditions.isRaining && !isSnow && !isFog && code !== null && code <= 1;
    const isCloudy = !conditions.isRaining && !isSnow && !isFog && code !== null && code >= 2 && code <= 3;
    const isStorm = code !== null && code >= 95;

    if (isStorm) {
      radar = "full";
      effects = IS_MOBILE ? "subtle" : "immersive";
    } else if (isSnow && !conditions.isRaining) {
      effects = IS_MOBILE ? "subtle" : "immersive";
    } else if (isFog && !conditions.isRaining) {
      effects = "subtle";
    } else if (isSunny) {
      effects = IS_MOBILE ? "subtle" : "immersive";
    } else if (isCloudy) {
      effects = "subtle";
    }

    if (!conditions.isRaining && conditions.windKmh && conditions.windKmh > 40) {
      radar = "minimal";
      if (effects === "off") effects = "subtle";
    }

    const isNight = conditions.isDay === false;
    if (isNight && effects === "off") {
      effects = "subtle";
    }

    applyAutoDisplay(radar, effects);
  }, [autoMode, conditions.isRaining, conditions.precipitationMm, conditions.windKmh, conditions.weatherCode, conditions.isDay, applyAutoDisplay]);
}
