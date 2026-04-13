/**
 * UI Design Tokens — Single source of truth for the entire super-app.
 *
 * STRICT RULES:
 * - Spacing: Only values from SPACING scale (4/8/10/12/16/20/24/32/40/48/64)
 * - Typography: Only TEXT presets or Tailwind's standard scale
 * - Radius: Only RADIUS values (8/12/16/20/full)
 * - Icons: Only ICON_SIZE values (16/20/24/32)
 * - Buttons: Always min-h-[44px] on mobile, min-h-[36px] for compact
 * - Cards: Always use CARD variants
 * - Text clamping: Always line-clamp-1 or line-clamp-2 for card text
 */

/* ══════════════════════════════════════════════════
   SPACING — Strict 4px-base scale
   ══════════════════════════════════════════════════ */
export const SPACING = {
  "2xs": "0.125rem",          // 2px — micro gaps only
  xs: "var(--space-xs)",      // 4px
  sm: "var(--space-sm)",      // 8px
  "sm-section": "0.625rem",  // 10px — section header mb
  "sm-md": "var(--space-sm-md)", // 12px
  md: "var(--space-md)",      // 16px
  "md-lg": "var(--space-md-lg)", // 20px
  lg: "var(--space-lg)",      // 24px
  xl: "var(--space-xl)",      // 32px
  "xl-2xl": "var(--space-xl-2xl)", // 40px
  "2xl": "var(--space-2xl)",  // 48px
  "3xl": "var(--space-3xl)",  // 64px
} as const;

/* ══════════════════════════════════════════════════
   BORDER RADIUS — Standard scale
   ══════════════════════════════════════════════════ */
export const RADIUS = {
  sm: "0.5rem",      // 8px — chips, badges, small elements
  md: "0.75rem",     // 12px — buttons, inputs
  lg: "1rem",        // 16px — cards, containers
  xl: "1.25rem",     // 20px — hero cards, modals
  full: "9999px",    // pills, avatars
} as const;

/* ══════════════════════════════════════════════════
   SHADOWS
   ══════════════════════════════════════════════════ */
export const SHADOW = {
  card: "var(--shadow-card)",
  cardHover: "var(--shadow-card-hover)",
  elevated: "var(--shadow-elevated)",
  gold: "var(--shadow-gold)",
} as const;

/* ══════════════════════════════════════════════════
   TOUCH TARGETS — iOS HIG compliant
   ══════════════════════════════════════════════════ */
export const TOUCH = {
  min: 44,        // px — absolute minimum
  navItem: 56,    // px — bottom nav item height
  bottomNav: 72,  // px — full bottom nav with labels
} as const;

/* ══════════════════════════════════════════════════
   ICON SIZES — Strict scale
   ══════════════════════════════════════════════════ */
export const ICON_SIZE = {
  "2xs": 12,  // decorative only
  xs: 14,     // badges, indicators
  sm: 16,     // inline with text, small buttons
  md: 20,     // standard UI icons
  lg: 24,     // primary actions, headers
  xl: 28,     // hero elements
  "2xl": 32,  // feature icons, empty states
} as const;

/* ══════════════════════════════════════════════════
   Z-INDEX — Layering scale
   ══════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════
   ANIMATION — Motion presets
   ══════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════
   BREAKPOINTS
   ══════════════════════════════════════════════════ */
export const BREAKPOINT = {
  xs: 340,    // ultra-small phones
  sm: 640,    // standard mobile
  md: 768,    // tablet
  lg: 1024,   // laptop
  xl: 1280,   // desktop
  "2xl": 1400, // wide desktop
} as const;

/* ══════════════════════════════════════════════════
   TYPOGRAPHY — Complete hierarchy
   ══════════════════════════════════════════════════

   Scale:
   display    = 28px bold   — hero/splash screens only
   h1         = 22px bold   — page titles
   h2         = 18px semibold — section titles
   h3         = 16px semibold — subsection titles
   h4         = 14px semibold — card group headers
   bodyLg     = 16px regular — emphasized body text
   body       = 14px regular — default body
   bodySm     = 12px regular — secondary body
   caption    = 11px regular — metadata, timestamps
   captionSm  = 10px regular — auxiliary labels
   label      = 10px semibold — form labels, category labels
   ══════════════════════════════════════════════════ */
export const TEXT = {
  display: "text-[28px] font-bold tracking-tight leading-tight text-foreground",
  pageTitle: "text-[22px] font-bold tracking-tight leading-tight text-foreground",
  sectionTitle: "text-lg font-semibold leading-snug text-foreground",
  sectionHeader: "text-[13px] font-bold text-foreground",
  h4: "text-sm font-semibold text-foreground",

  bodyLg: "text-base leading-relaxed text-foreground",
  body: "text-sm leading-relaxed text-foreground",
  bodySm: "text-xs leading-relaxed text-muted-foreground",

  cardTitle: "text-sm font-semibold text-foreground line-clamp-2 break-words",
  cardTitleSm: "text-xs font-bold text-foreground line-clamp-2 break-words",
  cardDesc: "text-xs text-muted-foreground line-clamp-2 break-words leading-relaxed",

  subtitle: "text-xs text-muted-foreground",
  subtitleSm: "text-[11px] text-muted-foreground",

  caption: "text-[11px] text-muted-foreground",
  captionSm: "text-[10px] text-muted-foreground",
  label: "text-[10px] font-semibold text-muted-foreground leading-tight",

  chip: "text-[11px] font-medium",
  button: "text-sm font-semibold",
  buttonSm: "text-xs font-semibold",
  navLabel: "text-[10px] font-medium leading-tight",

  price: "text-sm font-bold tabular-nums",
  priceLg: "text-base font-extrabold tabular-nums",
  priceXl: "text-lg font-extrabold tabular-nums",
  badge: "text-[10px] font-bold uppercase tracking-wider",
  stat: "text-xs font-extrabold tabular-nums",
  statLg: "text-base font-extrabold tabular-nums",
  statXl: "text-xl font-extrabold tabular-nums",
  statLabel: "text-[10px] font-medium text-muted-foreground",
  metadata: "text-[11px] text-muted-foreground",
  seeAll: "text-[11px] font-medium text-primary shrink-0",
} as const;

/* ══════════════════════════════════════════════════
   CARD SYSTEM — Standardized variants

   Small   = compact, icon/thumb + title + meta
   Medium  = image + title + desc + optional CTA
   Large   = hero visual + overlay text + CTA
   Story   = fixed ratio, overlay gradient
   Listing = image + title + price + location + badges
   Action  = dashboard shortcut, simple structure
   ══════════════════════════════════════════════════ */
export const CARD = {
  small: "rounded-xl border border-border/15 bg-card overflow-hidden p-3",
  medium: "rounded-2xl border border-border/15 bg-card overflow-hidden shadow-[var(--shadow-card)]",
  large: "rounded-2xl border border-border/10 bg-card overflow-hidden shadow-[var(--shadow-elevated)] relative",
  hero: "rounded-[1.25rem] overflow-hidden relative",

  story: "shrink-0 w-[100px] aspect-[3/4] rounded-2xl overflow-hidden relative",
  listing: "rounded-2xl border border-border/15 bg-card overflow-hidden shadow-[var(--shadow-card)]",
  action: "rounded-xl border border-border/10 bg-card/95 p-3 active:scale-[0.97] transition-transform",

  carousel: "shrink-0 w-[170px] rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.96] transition-transform",
  carouselWide: "shrink-0 w-[200px] rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.96] transition-transform",

  settings: "rounded-2xl border border-border/15 bg-card/95 backdrop-blur-sm",
  glass: "rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl",
  stat: "rounded-xl border border-border/15 bg-card p-3 flex flex-col",
  interactive: "rounded-[var(--card-radius)] border border-border/20 bg-card shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform duration-100",
} as const;

export const CARD_STYLES = CARD;

/* ══════════════════════════════════════════════════
   CARD INNER LAYOUT — Consistent padding & spacing
   ══════════════════════════════════════════════════ */
export const CARD_INNER = {
  padding: "p-3",
  paddingLg: "p-4",
  imageRatio: "aspect-[16/10]",
  imageRatioSquare: "aspect-square",
  imageRatioTall: "aspect-[3/4]",
  titleGap: "mt-2",
  metaGap: "mt-1",
  ctaGap: "mt-3",
} as const;

/* ══════════════════════════════════════════════════
   BUTTON SYSTEM — Height / padding standards
   ══════════════════════════════════════════════════ */
export const BTN = {
  primary: "min-h-[44px] px-5 rounded-xl font-semibold active:scale-[0.97] transition-transform duration-100",
  secondary: "min-h-[44px] px-5 rounded-xl font-medium border border-border active:scale-[0.97] transition-transform duration-100",
  ghost: "min-h-[44px] px-4 rounded-xl active:scale-[0.97] transition-transform duration-100",
  destructive: "min-h-[44px] px-5 rounded-xl font-semibold active:scale-[0.97] transition-transform duration-100",
  sm: "min-h-[36px] px-3 rounded-lg text-xs font-semibold active:scale-[0.97] transition-transform duration-100",
  icon: "min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center active:scale-[0.92] transition-transform duration-100",
  iconSm: "min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center active:scale-[0.92] transition-transform duration-100",
  quickAction: "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/8 backdrop-blur-xl px-2 active:scale-[0.93] transition-all min-w-0",
} as const;

/* ══════════════════════════════════════════════════
   CAROUSEL — Horizontal scroll patterns
   ══════════════════════════════════════════════════ */
export const CAROUSEL = {
  container: "flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none px-1",
  containerSnap: "flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory",
  item: "shrink-0 snap-start",
  itemWidth: "w-[170px]",
  itemWidthWide: "w-[200px]",
} as const;

/* ══════════════════════════════════════════════════
   SECTION — Page section patterns
   ══════════════════════════════════════════════════ */
export const SECTION = {
  container: "mb-5",
  containerCompact: "mb-4",
  header: "flex items-center justify-between mb-2.5 px-1",
  headerTitle: "text-[13px] font-bold text-foreground flex items-center gap-1.5",
  headerAction: "text-[11px] font-medium text-primary flex items-center gap-0.5 active:opacity-70 shrink-0",
} as const;

/* ══════════════════════════════════════════════════
   GRID — Responsive layout system
   ══════════════════════════════════════════════════ */
export const GRID = {
  cols2: "grid grid-cols-2 gap-3",
  cols3: "grid grid-cols-2 sm:grid-cols-3 gap-3",
  cols4: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
  autoFill: "grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(170px,100%),1fr))]",
  autoFillWide: "grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))]",
  stats: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
} as const;

/* ══════════════════════════════════════════════════
   CATEGORY — Icon grid items
   ══════════════════════════════════════════════════ */
export const CATEGORY = {
  card: "flex flex-col items-center justify-center rounded-xl border border-border/10 bg-muted/20 p-2 pt-2.5 pb-2 w-[72px] min-h-[72px] active:scale-[0.93] transition-all shrink-0",
  label: "w-full text-center text-[10px] font-bold leading-tight text-foreground line-clamp-2",
  icon: "flex items-center justify-center mb-1 shrink-0",
  strip: "flex flex-col items-center gap-1.5 w-[64px] active:scale-[0.92] transition-transform shrink-0",
  stripLabel: "text-[10px] font-semibold text-muted-foreground leading-tight text-center line-clamp-2 w-full",
} as const;

/* ══════════════════════════════════════════════════
   SETTINGS — Row pattern
   ══════════════════════════════════════════════════ */
export const SETTINGS_ROW = "flex items-center gap-3 px-4 py-3.5 min-h-[52px] active:bg-muted/50 transition-colors rounded-xl cursor-pointer" as const;

/* ══════════════════════════════════════════════════
   PAGE — Container patterns
   ══════════════════════════════════════════════════ */
export const PAGE = {
  container: "max-w-md mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
  containerWide: "max-w-2xl mx-auto px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
  containerFull: "w-full px-4 py-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))]",
  header: "flex items-center gap-3 mb-5",
  section: "mb-6",
  sectionCompact: "mb-4",
} as const;

/* ══════════════════════════════════════════════════
   FORM — Field patterns
   ══════════════════════════════════════════════════ */
export const FORM = {
  group: "flex flex-col",
  label: "text-sm font-medium text-foreground mb-1.5",
  input: "h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
  helper: "text-[11px] text-muted-foreground mt-1",
  error: "text-[11px] text-destructive mt-1",
  grid: "grid grid-cols-1 sm:grid-cols-2 gap-4",
} as const;

/* ══════════════════════════════════════════════════
   STATE — Interactive states
   ══════════════════════════════════════════════════ */
export const STATE = {
  disabled: "opacity-50 pointer-events-none",
  loading: "animate-pulse",
  error: "border-destructive/50 bg-destructive/5",
  success: "border-success/50 bg-success/5",
  active: "border-primary bg-primary/5",
  hover: "hover:bg-muted/50 transition-colors",
} as const;

/* ══════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════ */
export const EMPTY_STATE = {
  container: "flex flex-col items-center justify-center py-12 px-6 text-center",
  icon: "w-16 h-16 text-muted-foreground/30 mb-4",
  title: "text-base font-semibold text-foreground mb-1",
  description: "text-sm text-muted-foreground max-w-[280px]",
} as const;

/* ══════════════════════════════════════════════════
   GPS ACCURACY
   ══════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════
   COLOR — Brand & semantic tokens (CSS variable-backed)
   ══════════════════════════════════════════════════ */
export const COLOR = {
  gold: "hsl(var(--gold))",
  goldLight: "hsl(var(--gold-light))",
  goldDark: "hsl(var(--gold-dark))",
  navy: "hsl(var(--navy))",
  navyDeep: "hsl(var(--navy-deep))",
  navyLight: "hsl(var(--navy-light))",

  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
  destructive: "hsl(var(--destructive))",

  foreground: "hsl(var(--foreground))",
  mutedForeground: "hsl(var(--muted-foreground))",
  background: "hsl(var(--background))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  muted: "hsl(var(--muted))",
} as const;

export const ACCENT = {
  blue: "hsl(210 80% 52%)",
  rose: "hsl(350 65% 55%)",
  amber: "hsl(38 92% 50%)",
  emerald: "hsl(152 60% 42%)",
  violet: "hsl(270 60% 55%)",
  cyan: "hsl(190 75% 46%)",
  slate: "hsl(220 15% 50%)",
  orange: "hsl(25 90% 52%)",
  navy: "hsl(220 40% 18%)",
  gold: "hsl(38 65% 56%)",
} as const;

/* ══════════════════════════════════════════════════
   LINE HEIGHT — Semantic scale
   ══════════════════════════════════════════════════ */
export const LINE_HEIGHT = {
  none: 1,
  tight: 1.15,
  snug: 1.3,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.8,
} as const;

/* ══════════════════════════════════════════════════
   DENSITY — Card & list content density presets
   ══════════════════════════════════════════════════ */
export const DENSITY = {
  compact: { padding: "p-2.5", gap: "gap-1.5", minHeight: "min-h-[80px]" },
  default: { padding: "p-3", gap: "gap-2", minHeight: "min-h-[100px]" },
  comfortable: { padding: "p-4", gap: "gap-3", minHeight: "min-h-[120px]" },
  spacious: { padding: "p-5", gap: "gap-4", minHeight: "min-h-[140px]" },
} as const;
