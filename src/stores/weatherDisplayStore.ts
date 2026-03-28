/**
 * Weather Display Store — Controls how weather is DISPLAYED, not the data itself.
 * Weather data is always-on (useLiveWeatherStation). This store controls overlays/effects/alerts.
 */
import { create } from "zustand";

export type WeatherOverlayLevel = "off" | "minimal" | "full";
export type WeatherEffectsLevel = "off" | "subtle" | "immersive";
export type WeatherAlertLevel = "minimal" | "normal" | "priority";

interface WeatherDisplayState {
  /** Radar tile overlay visibility */
  radarOverlay: WeatherOverlayLevel;
  /** Visual effects: fog, rain CSS, glow */
  effectsLevel: WeatherEffectsLevel;
  /** Alert badge visibility */
  alertLevel: WeatherAlertLevel;
  /** Station markers on map */
  showStations: boolean;
  /** Auto mode — system decides based on conditions */
  autoMode: boolean;

  // Actions
  setRadarOverlay: (level: WeatherOverlayLevel) => void;
  setEffectsLevel: (level: WeatherEffectsLevel) => void;
  setAlertLevel: (level: WeatherAlertLevel) => void;
  toggleStations: () => void;
  toggleAutoMode: () => void;
  /** Called by auto-mode logic to apply computed display */
  applyAutoDisplay: (radar: WeatherOverlayLevel, effects: WeatherEffectsLevel) => void;
}

export const useWeatherDisplayStore = create<WeatherDisplayState>((set) => ({
  radarOverlay: "full",
  effectsLevel: "subtle",
  alertLevel: "normal",
  showStations: true,
  autoMode: true,

  setRadarOverlay: (level) => set({ radarOverlay: level, autoMode: false }),
  setEffectsLevel: (level) => set({ effectsLevel: level, autoMode: false }),
  setAlertLevel: (level) => set({ alertLevel: level }),
  toggleStations: () => set((s) => ({ showStations: !s.showStations })),
  toggleAutoMode: () => set((s) => ({ autoMode: !s.autoMode })),
  applyAutoDisplay: (radar, effects) => set({ radarOverlay: radar, effectsLevel: effects }),
}));
