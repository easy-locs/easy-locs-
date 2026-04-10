/**
 * UI Design Tokens — Single source of truth for component sizing, spacing, and styling.
 * All components must reference these tokens instead of ad-hoc values.
 *
 * RULES:
 * - No random font sizes — use TEXT presets or Tailwind's scale (text-xs, text-sm, text-base)
 * - Minimum label size: text-[10px] (only for decorative/auxiliary content)
 * - Minimum interactive text: text-[10px] / text-xs
 * - No random margins/padding — use SPACING scale or Tailwind's scale (p-1 through p-8)
 * - All cards use CARD_STYLES variants
 * - All buttons respect TOUCH.min (44px) on mobile
 */

/* ── Spacing scale (maps to CSS vars in index.css) ── */
export const SPACING = {
  "2xs": "0.125rem", // 2px
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
  bottomNav: 72, // px — full bottom nav with labels
} as const;

/* ── Icon sizes ── */
export const ICON_SIZE = {
  "2xs": 12,
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  "2xl": 32,
} as const;

/* ── Z-Index scale ── */
export const Z = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
  topNav: 80,
  bottomNav: 90,
  max: 100,
} as const;

/* ── Animation timing ── */
export const MOTION = {
  fast: { duration: 0.1 },
  normal: { duration: 0.2 },
  slow: { duration: 0.35 },
  spring: { type: "spring" as const, stiffness: 400, damping: 25 },
  springGentle: { type: "spring" as const, stiffness: 300, damping: 30 },
  enterScale: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
  enterY: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } },
  enterX: { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 } },
  press: { whileTap: { scale: 0.97 } },
} as const;

/* ── Breakpoints ── */
export const BREAKPOINT = {
  xs: 340,   // ultra-small phones
  sm: 640,   // standard mobile
  md: 768,   // tablet
  lg: 1024,  // laptop
  xl: 1280,  // desktop
  "2xl": 1400, // wide desktop
} as const;

/* ── Typography classes (use with cn()) ── */
export const TEXT = {
  pageTitle: "text-xl font-bold tracking-tight text-foreground",
  sectionTitle: "text-base font-semibold text-foreground",
  sectionHeader: "text-[13px] font-bold text-foreground",
  cardTitle: "text-sm font-semibold text-foreground line-clamp-2 break-words",
  cardTitleSm: "text-xs font-bold text-foreground line-clamp-2 break-words",
  subtitle: "text-xs text-muted-foreground",
  subtitleSm: "text-[11px] text-muted-foreground",
  body: "text-sm leading-relaxed text-foreground",
  bodySm: "text-xs leading-relaxed text-muted-foreground",
  caption: "text-[11px] text-muted-foreground",
  captionSm: "text-[10px] text-muted-foreground",
  label: "text-[10px] font-semibold text-muted-foreground leading-tight",
  chip: "text-[11px] font-medium",
  button: "text-sm font-semibold",
  buttonSm: "text-xs font-semibold",
  navLabel: "text-[10px] font-medium leading-tight",
  price: "text-sm font-bold tabular-nums",
  priceLg: "text-base font-bold tabular-nums",
  badge: "text-[10px] font-bold uppercase tracking-wider",
  stat: "text-xs font-extrabold tabular-nums",
  statLabel: "text-[10px] font-medium text-muted-foreground",
  metadata: "text-[11px] text-muted-foreground",
  seeAll: "text-[11px] font-medium text-primary shrink-0",
} as const;

/* ── Card variants ── */
export const CARD_STYLES = {
  base: "rounded-[var(--card-radius)] border border-border/20 bg-card shadow-[var(--shadow-card)]",
  interactive: "rounded-[var(--card-radius)] border border-border/20 bg-card shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform duration-100",
  carousel: "shrink-0 w-[170px] rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.96] transition-transform",
  carouselWide: "shrink-0 w-[200px] rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.96] transition-transform",
  settings: "rounded-2xl border border-border/15 bg-card/95 backdrop-blur-sm",
  elevated: "rounded-[var(--card-radius)] border border-border/10 bg-card shadow-[var(--shadow-elevated)]",
  glass: "rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl",
} as const;

/* ── Button preset classes ── */
export const BTN = {
  primary: "min-h-[44px] rounded-[var(--btn-radius)] font-semibold active:scale-[0.97] transition-transform duration-100",
  secondary: "min-h-[44px] rounded-[var(--btn-radius)] font-medium active:scale-[0.97] transition-transform duration-100",
  ghost: "min-h-[44px] rounded-[var(--btn-radius)] active:scale-[0.97] transition-transform duration-100",
  icon: "min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center active:scale-[0.92] transition-transform duration-100",
  quickAction: "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/8 backdrop-blur-xl px-2 active:scale-[0.93] transition-all min-w-0",
} as const;

/* ── Carousel / horizontal scroll ── */
export const CAROUSEL = {
  container: "flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none px-1",
  containerSnap: "flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory",
  item: "shrink-0 snap-start",
  itemWidth: "w-[170px]",
  itemWidthWide: "w-[200px]",
} as const;

/* ── Section layout ── */
export const SECTION = {
  container: "mb-4",
  header: "flex items-center justify-between mb-2 px-1",
  headerTitle: "text-[13px] font-bold text-foreground flex items-center gap-1.5",
  headerAction: "text-[11px] font-medium text-primary flex items-center gap-0.5 active:opacity-70 shrink-0",
} as const;

/* ── Category card / icon grid ── */
export const CATEGORY = {
  card: "flex flex-col items-center justify-center rounded-xl border border-border/10 bg-muted/20 p-2 pt-2.5 pb-2 w-[72px] min-h-[74px] active:scale-[0.93] transition-all shrink-0",
  label: "w-full text-center text-[10px] font-bold leading-tight text-foreground line-clamp-2",
  icon: "flex items-center justify-center mb-1 shrink-0",
  strip: "flex flex-col items-center gap-1.5 w-[64px] active:scale-[0.92] transition-transform shrink-0",
  stripLabel: "text-[10px] font-semibold text-muted-foreground leading-tight text-center line-clamp-2 w-full",
} as const;

/* ── Settings row ── */
export const SETTINGS_ROW = "flex items-center gap-3 px-4 py-3.5 min-h-[52px] active:bg-muted/50 transition-colors rounded-xl cursor-pointer" as const;

/* ── Page container ── */
export const PAGE = {
  container: "max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
  containerWide: "max-w-2xl mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
  containerFull: "w-full px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
  header: "flex items-center gap-3 mb-5",
  section: "mb-6",
  sectionCompact: "mb-4",
} as const;

/* ── State classes ── */
export const STATE = {
  disabled: "opacity-50 pointer-events-none",
  loading: "animate-pulse",
  error: "border-destructive/50 bg-destructive/5",
  success: "border-success/50 bg-success/5",
  active: "border-primary bg-primary/5",
  hover: "hover:bg-muted/50 transition-colors",
} as const;

/* ── Empty state ── */
export const EMPTY_STATE = {
  container: "flex flex-col items-center justify-center py-12 px-6 text-center",
  icon: "w-16 h-16 text-muted-foreground/30 mb-4",
  title: "text-base font-semibold text-foreground mb-1",
  description: "text-sm text-muted-foreground max-w-[280px]",
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
