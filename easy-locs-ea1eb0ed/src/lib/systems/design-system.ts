import type { PlatformEventType } from "@/lib/shared/platform-bus";

export const SPACING_SCALE = {
  "0": "0px",
  "0.5": "2px",
  "1": "4px",
  "1.5": "6px",
  "2": "8px",
  "2.5": "10px",
  "3": "12px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "8": "32px",
  "10": "40px",
  "12": "48px",
  "16": "64px",
  "20": "80px",
  "24": "96px",
} as const;

export const TYPOGRAPHY_SCALE = {
  "display-xl": { size: "36px", lineHeight: "40px", weight: 700, tracking: "-0.02em" },
  "display-lg": { size: "30px", lineHeight: "36px", weight: 700, tracking: "-0.015em" },
  "heading-lg": { size: "24px", lineHeight: "32px", weight: 700, tracking: "-0.01em" },
  "heading-md": { size: "20px", lineHeight: "28px", weight: 600, tracking: "-0.005em" },
  "heading-sm": { size: "16px", lineHeight: "24px", weight: 600, tracking: "0" },
  "body-lg": { size: "16px", lineHeight: "24px", weight: 400, tracking: "0" },
  "body-md": { size: "14px", lineHeight: "20px", weight: 400, tracking: "0" },
  "body-sm": { size: "12px", lineHeight: "16px", weight: 400, tracking: "0" },
  "caption": { size: "11px", lineHeight: "14px", weight: 400, tracking: "0.01em" },
  "overline": { size: "10px", lineHeight: "12px", weight: 600, tracking: "0.05em" },
} as const;

export const COLOR_TOKENS = {
  primary: "hsl(var(--primary))",
  primaryForeground: "hsl(var(--primary-foreground))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted))",
  accent: "hsl(var(--accent))",
  destructive: "hsl(var(--destructive))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  success: "hsl(var(--hud-success))",
  warning: "hsl(var(--hud-warning))",
  danger: "hsl(var(--hud-danger))",
  info: "hsl(210 100% 50%)",
} as const;

export const ELEVATION = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const GRID_SYSTEM = {
  mobile: { columns: 4, gutter: 16, margin: 16 },
  tablet: { columns: 8, gutter: 24, margin: 24 },
  desktop: { columns: 12, gutter: 24, margin: 32 },
} as const;

export const ANIMATION_TOKENS = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 400,
    deliberate: 600,
  },
  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
} as const;

export const RADIUS = {
  none: "0px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px",
} as const;

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

export const DESIGN_SYSTEM_VERSION = "1.0.0" as const;
