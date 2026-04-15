/**
 * Easy-Locs Radar Theme — branded color palette for the radar experience.
 */
import { MARKER_COLORS } from "@/config/colors";

export const EASYLOCS_RADAR_THEME = {
  bg: MARKER_COLORS.dark,
  primary: MARKER_COLORS.primary,
  live: MARKER_COLORS.live,
  service: MARKER_COLORS.warning,
  driver: MARKER_COLORS.accent,
  seller: MARKER_COLORS.seller,
  store: MARKER_COLORS.store,
  ring: "rgba(79,70,229,0.18)",
  ringStrong: "rgba(6,182,212,0.24)",
  glow: "rgba(79,70,229,0.35)",
} as const;
