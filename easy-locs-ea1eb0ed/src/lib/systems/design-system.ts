/**
 * @deprecated Import directly from "@/lib/design-tokens" instead.
 * This file re-exports all tokens from the canonical DESIGN_TOKENS source.
 * Kept for backward compatibility — all values derive from DESIGN_TOKENS.
 */
import type { PlatformEventType } from "@/lib/shared/platform-bus";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

export {
  DESIGN_TOKENS,
  generateCSSCustomProperties as generateCSSVariables,
  getSpacing,
  getRadius,
  getElevation,
  getColor,
  getTypography,
} from "@/lib/design-tokens";

export const SPACING_SCALE = DESIGN_TOKENS.spacing;

export const TYPOGRAPHY_SCALE = DESIGN_TOKENS.typography;

export const COLOR_TOKENS = DESIGN_TOKENS.colors;

export const ELEVATION = DESIGN_TOKENS.elevation;

export const BREAKPOINTS = DESIGN_TOKENS.breakpoints;

export const GRID_SYSTEM = DESIGN_TOKENS.grid;

export const ANIMATION_TOKENS = DESIGN_TOKENS.animation;

export const RADIUS = DESIGN_TOKENS.radius;

export type ComponentVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ComponentState = "idle" | "hover" | "active" | "focus" | "disabled" | "loading" | "error";

export const COMPONENT_REGISTRY = [
  "button", "input", "select", "textarea", "checkbox", "radio", "switch", "slider",
  "bottom-sheet", "modal", "dialog", "drawer", "popover", "tooltip",
  "card", "list-item", "avatar", "badge", "chip", "tag",
  "tabs", "segmented-control", "accordion",
  "skeleton", "spinner", "progress",
  "empty-state", "error-state", "offline-state",
  "toast", "alert", "banner-notification",
  "breadcrumb", "pagination", "stepper",
] as const;

export type DesignSystemEvent = Extract<PlatformEventType, `ui:${string}`>;

export const DESIGN_SYSTEM_VERSION = "2.0.0" as const;
