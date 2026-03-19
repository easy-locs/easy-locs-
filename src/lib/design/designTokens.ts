/**
 * Design Tokens — Canonical spacing, typography, and surface definitions.
 * All components should consume these tokens instead of raw values.
 */

// ─── Spacing scale (px) ───
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

// ─── Typography scale ───
export const TYPOGRAPHY = {
  caption: { size: "0.75rem", weight: 400, lineHeight: 1.4 },
  body: { size: "0.875rem", weight: 400, lineHeight: 1.5 },
  bodyStrong: { size: "0.875rem", weight: 600, lineHeight: 1.5 },
  subtitle: { size: "1rem", weight: 600, lineHeight: 1.4 },
  title: { size: "1.125rem", weight: 700, lineHeight: 1.3 },
  heading: { size: "1.5rem", weight: 700, lineHeight: 1.2 },
  display: { size: "2rem", weight: 800, lineHeight: 1.1 },
} as const;

// ─── Card system ───
export const CARD = {
  radius: "var(--card-radius)",
  padding: "var(--card-padding)",
  shadow: "var(--shadow-card, 0 1px 3px 0 hsl(0 0% 0% / 0.06))",
  border: "1px solid hsl(var(--border) / 0.4)",
  imageRatio: "16 / 9",
  minImageHeight: 120,
} as const;

// ─── Button system ───
export const BUTTON = {
  radius: "var(--btn-radius)",
  heightDefault: "var(--input-height)",
  heightSm: "var(--input-height-sm)",
  heightLg: "3rem",
  touchMin: "var(--touch-min)",
} as const;

// ─── Form system ───
export const FORM = {
  inputHeight: "var(--input-height)",
  inputRadius: "var(--btn-radius)",
  labelSize: "0.875rem",
  labelWeight: 500,
  fieldGap: SPACING.md,
  sectionGap: SPACING.xl,
} as const;

// ─── Surface system ───
export const SURFACE = {
  background: "hsl(var(--background))",
  card: "hsl(var(--card))",
  muted: "hsl(var(--muted))",
  accent: "hsl(var(--accent))",
  primary: "hsl(var(--primary))",
  destructive: "hsl(var(--destructive))",
} as const;

// ─── Breakpoints ───
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// ─── Z-index scale ───
export const Z_INDEX = {
  base: 0,
  card: 1,
  sticky: 10,
  header: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  fab: 45,
} as const;
