/**
 * UI Design Tokens — Single source of truth for component sizing, spacing, and styling.
 * All components must reference these tokens instead of ad-hoc values.
 */

/* ── Spacing scale (maps to CSS vars in index.css) ── */
export const SPACING = {
  xs: "var(--space-xs)",    // 4px
  sm: "var(--space-sm)",    // 8px
  md: "var(--space-md)",    // 16px
  lg: "var(--space-lg)",    // 24px
  xl: "var(--space-xl)",    // 32px
  "2xl": "var(--space-2xl)", // 48px
} as const;

/* ── Border radius ── */
export const RADIUS = {
  sm: "0.5rem",      // 8px — chips, badges
  md: "0.75rem",     // 12px — buttons, inputs
  lg: "0.875rem",    // 14px — cards
  xl: "1rem",        // 16px — modals, sheets
  "2xl": "1.25rem",  // 20px — hero cards
  full: "9999px",    // pills
} as const;

/* ── Shadows ── */
export const SHADOW = {
  card: "var(--shadow-card)",
  cardHover: "var(--shadow-card-hover)",
  elevated: "var(--shadow-elevated)",
  gold: "var(--shadow-gold)",
} as const;

/* ── Touch targets ── */
export const TOUCH = {
  min: 44, // px — iOS minimum
  navItem: 56, // px — bottom nav height
} as const;

/* ── Icon sizes ── */
export const ICON_SIZE = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

/* ── Typography classes (use with cn()) ── */
export const TEXT = {
  pageTitle: "text-xl font-bold tracking-tight text-foreground",
  sectionTitle: "text-base font-semibold text-foreground",
  cardTitle: "text-sm font-semibold text-foreground",
  subtitle: "text-xs text-muted-foreground",
  caption: "text-[11px] text-muted-foreground",
  chip: "text-[11px] font-medium",
  button: "text-sm font-semibold",
  navLabel: "text-[10px] font-medium leading-tight",
  price: "text-sm font-bold tabular-nums",
  badge: "text-[10px] font-bold uppercase tracking-wider",
} as const;

/* ── Card variants ── */
export const CARD_STYLES = {
  base: "rounded-[var(--card-radius)] border border-border/20 bg-card shadow-[var(--shadow-card)]",
  interactive: "rounded-[var(--card-radius)] border border-border/20 bg-card shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform duration-100",
  settings: "rounded-2xl border border-border/15 bg-card/95 backdrop-blur-sm",
  elevated: "rounded-[var(--card-radius)] border border-border/10 bg-card shadow-[var(--shadow-elevated)]",
} as const;

/* ── Button preset classes ── */
export const BTN = {
  primary: "min-h-[44px] rounded-[var(--btn-radius)] font-semibold active:scale-[0.97] transition-transform duration-100",
  secondary: "min-h-[44px] rounded-[var(--btn-radius)] font-medium active:scale-[0.97] transition-transform duration-100",
  ghost: "min-h-[44px] rounded-[var(--btn-radius)] active:scale-[0.97] transition-transform duration-100",
  icon: "min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center active:scale-[0.92] transition-transform duration-100",
} as const;

/* ── Settings row ── */
export const SETTINGS_ROW = "flex items-center gap-3 px-4 py-3.5 min-h-[52px] active:bg-muted/50 transition-colors rounded-xl cursor-pointer" as const;

/* ── Page container ── */
export const PAGE = {
  container: "max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
  header: "flex items-center gap-3 mb-5",
} as const;

/* ── Accuracy levels for GPS ── */
export const GPS_ACCURACY = {
  excellent: { max: 10, label: "Exact", color: "text-emerald-500" },
  good: { max: 50, label: "Good", color: "text-blue-500" },
  approximate: { max: 500, label: "Approximate", color: "text-amber-500" },
  poor: { max: Infinity, label: "Low precision", color: "text-red-500" },
} as const;

export function getAccuracyLevel(meters: number | null | undefined) {
  if (!meters) return GPS_ACCURACY.poor;
  if (meters <= GPS_ACCURACY.excellent.max) return GPS_ACCURACY.excellent;
  if (meters <= GPS_ACCURACY.good.max) return GPS_ACCURACY.good;
  if (meters <= GPS_ACCURACY.approximate.max) return GPS_ACCURACY.approximate;
  return GPS_ACCURACY.poor;
}
