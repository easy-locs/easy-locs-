/**
 * Premium map design tokens — single source of truth for light/dark/premium
 * styling across SuperMap, Radar, Ride, Delivery, Property maps.
 *
 * Tokens are CSS variables consumed by overlays AND raw color strings used
 * by MapLibre paint properties (which can't read CSS variables directly).
 */

export type MapTheme = "light" | "dark" | "premium" | "auto";

export interface MapDesignTokens {
  theme: Exclude<MapTheme, "auto">;
  surface: string;
  surfaceMuted: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accentMuted: string;
  success: string;
  warn: string;
  danger: string;
  /** Used for clusters / hot pins. */
  hotGradient: [string, string];
  /** Used for cool pins / inactive markers. */
  coolGradient: [string, string];
  /** Used for traffic legend "low" color. */
  trafficLow: string;
  trafficModerate: string;
  trafficHeavy: string;
  trafficSevere: string;
  /** Backdrop overlay opacity (controls). */
  controlBackdropOpacity: number;
}

export const LIGHT_TOKENS: MapDesignTokens = {
  theme: "light",
  surface: "hsl(0, 0%, 100%)",
  surfaceMuted: "hsl(220, 20%, 96%)",
  ink: "hsl(220, 30%, 12%)",
  inkMuted: "hsl(220, 14%, 38%)",
  accent: "hsl(212, 95%, 52%)",
  accentMuted: "hsl(212, 60%, 88%)",
  success: "hsl(146, 70%, 38%)",
  warn: "hsl(38, 92%, 48%)",
  danger: "hsl(0, 78%, 50%)",
  hotGradient: ["hsl(28, 95%, 60%)", "hsl(0, 78%, 52%)"],
  coolGradient: ["hsl(212, 90%, 60%)", "hsl(212, 95%, 42%)"],
  trafficLow: "hsl(140, 70%, 40%)",
  trafficModerate: "hsl(45, 95%, 50%)",
  trafficHeavy: "hsl(20, 90%, 52%)",
  trafficSevere: "hsl(0, 80%, 48%)",
  controlBackdropOpacity: 0.85,
};

export const DARK_TOKENS: MapDesignTokens = {
  theme: "dark",
  surface: "hsl(220, 20%, 8%)",
  surfaceMuted: "hsl(220, 18%, 14%)",
  ink: "hsl(220, 14%, 96%)",
  inkMuted: "hsl(220, 10%, 70%)",
  accent: "hsl(212, 95%, 62%)",
  accentMuted: "hsl(212, 50%, 26%)",
  success: "hsl(146, 70%, 50%)",
  warn: "hsl(38, 92%, 58%)",
  danger: "hsl(0, 78%, 60%)",
  hotGradient: ["hsl(28, 95%, 60%)", "hsl(0, 78%, 56%)"],
  coolGradient: ["hsl(212, 90%, 65%)", "hsl(212, 95%, 48%)"],
  trafficLow: "hsl(140, 70%, 45%)",
  trafficModerate: "hsl(45, 95%, 55%)",
  trafficHeavy: "hsl(20, 90%, 55%)",
  trafficSevere: "hsl(0, 80%, 50%)",
  controlBackdropOpacity: 0.65,
};

export const PREMIUM_TOKENS: MapDesignTokens = {
  ...DARK_TOKENS,
  theme: "premium",
  surface: "hsl(228, 28%, 6%)",
  surfaceMuted: "hsl(228, 22%, 10%)",
  accent: "hsl(280, 90%, 65%)",
  accentMuted: "hsl(280, 50%, 22%)",
  hotGradient: ["hsl(310, 90%, 62%)", "hsl(280, 95%, 50%)"],
  coolGradient: ["hsl(195, 90%, 62%)", "hsl(228, 90%, 48%)"],
  controlBackdropOpacity: 0.55,
};

export function resolveTheme(theme: MapTheme): Exclude<MapTheme, "auto"> {
  if (theme !== "auto") return theme;
  if (typeof window === "undefined") return "dark";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export function getTokens(theme: MapTheme): MapDesignTokens {
  const resolved = resolveTheme(theme);
  switch (resolved) {
    case "light": return LIGHT_TOKENS;
    case "premium": return PREMIUM_TOKENS;
    case "dark":
    default: return DARK_TOKENS;
  }
}

/** Apply tokens as CSS custom properties on `:root` (or a target element). */
export function applyTokensToCss(tokens: MapDesignTokens, root?: HTMLElement) {
  if (typeof document === "undefined") return;
  const target = root ?? document.documentElement;
  const map: Record<string, string> = {
    "--map-surface": tokens.surface,
    "--map-surface-muted": tokens.surfaceMuted,
    "--map-ink": tokens.ink,
    "--map-ink-muted": tokens.inkMuted,
    "--map-accent": tokens.accent,
    "--map-accent-muted": tokens.accentMuted,
    "--map-success": tokens.success,
    "--map-warn": tokens.warn,
    "--map-danger": tokens.danger,
    "--map-traffic-low": tokens.trafficLow,
    "--map-traffic-moderate": tokens.trafficModerate,
    "--map-traffic-heavy": tokens.trafficHeavy,
    "--map-traffic-severe": tokens.trafficSevere,
    "--map-control-backdrop-opacity": String(tokens.controlBackdropOpacity),
  };
  for (const [k, v] of Object.entries(map)) target.style.setProperty(k, v);
}
