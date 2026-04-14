export const SPACING = {
  "2xs": "0.25rem",
  xs: "0.5rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
} as const;

export const SPACING_PX = {
  4: "4px",
  8: "8px",
  12: "12px",
  16: "16px",
  24: "24px",
  32: "32px",
  48: "48px",
  64: "64px",
} as const;

export const RADIUS = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const;

export const SHADOW = {
  subtle: "0 1px 2px hsl(0 0% 0% / 0.04)",
  medium: "0 2px 8px hsl(0 0% 0% / 0.06), 0 1px 2px hsl(0 0% 0% / 0.04)",
  elevated: "0 8px 24px hsl(0 0% 0% / 0.1), 0 2px 8px hsl(0 0% 0% / 0.06)",
  card: "0 2px 12px hsl(0 0% 0% / 0.18), 0 1px 3px hsl(0 0% 0% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.03)",
  modal: "0 12px 48px hsl(0 0% 0% / 0.3), 0 4px 16px hsl(0 0% 0% / 0.12)",
  glow: "0 0 20px hsl(168 72% 44% / 0.12), 0 0 6px hsl(168 72% 44% / 0.06)",
} as const;

export const COLOR = {
  background: "hsl(228 28% 7%)",
  card: "hsl(226 24% 10%)",
  cardHover: "hsl(226 24% 12%)",
  surface: "hsl(226 24% 11%)",
  surfaceElevated: "hsl(226 24% 14%)",
  foreground: "hsl(210 18% 93%)",
  muted: "hsl(226 20% 13%)",
  mutedForeground: "hsl(215 12% 52%)",
  border: "hsl(226 20% 15%)",
  borderSubtle: "hsl(0 0% 100% / 0.05)",
  borderHover: "hsl(0 0% 100% / 0.1)",
  accent: "hsl(168 72% 44%)",
  accentDim: "hsl(168 50% 36%)",
  accentForeground: "hsl(226 28% 7%)",
  destructive: "hsl(0 72% 51%)",
  textPrimary: "hsl(0 0% 100% / 0.9)",
  textSecondary: "hsl(0 0% 100% / 0.55)",
  textTertiary: "hsl(0 0% 100% / 0.35)",
  textMuted: "hsl(0 0% 100% / 0.2)",
  overlay: "hsl(228 28% 7% / 0.8)",
} as const;

export const GRADIENT = {
  card: "linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))",
  hero: "linear-gradient(135deg, hsl(226 24% 10%), hsl(228 28% 7%))",
  accent: "linear-gradient(135deg, hsl(168 72% 44%), hsl(168 72% 38%))",
  overlay: "linear-gradient(180deg, transparent 0%, hsl(228 28% 7% / 0.6) 40%, hsl(228 28% 7% / 0.92) 100%)",
} as const;

export const SURFACE = {
  card: {
    background: GRADIENT.card,
    border: `1px solid ${COLOR.borderSubtle}`,
    boxShadow: SHADOW.card,
    borderRadius: RADIUS["2xl"],
  },
  elevated: {
    background: COLOR.surfaceElevated,
    border: `1px solid ${COLOR.borderSubtle}`,
    boxShadow: SHADOW.elevated,
    borderRadius: RADIUS.xl,
  },
  glass: {
    background: "hsl(226 24% 10% / 0.7)",
    backdropFilter: "blur(20px) saturate(1.3)",
    WebkitBackdropFilter: "blur(20px) saturate(1.3)",
    border: `1px solid ${COLOR.borderSubtle}`,
    boxShadow: SHADOW.card,
    borderRadius: RADIUS["2xl"],
  },
} as const;

export const TYPOGRAPHY = {
  display: { size: "2rem", weight: 800, leading: 1.15, tracking: "-0.02em" },
  heading: { size: "1.5rem", weight: 700, leading: 1.2, tracking: "-0.015em" },
  title: { size: "1.125rem", weight: 600, leading: 1.3, tracking: "0" },
  body: { size: "0.875rem", weight: 400, leading: 1.5, tracking: "0" },
  caption: { size: "0.75rem", weight: 500, leading: 1.4, tracking: "0" },
  overline: { size: "0.6875rem", weight: 600, leading: 1.3, tracking: "0.04em" },
} as const;

export { AppCard } from "./AppCard";
export type { AppCardProps } from "./AppCard";

export { AppText, AppCardTitle, CardTitle, LabelText } from "./AppText";

export { AppPrice } from "./AppPrice";
export type { AppPriceProps } from "./AppPrice";

export { AppChip } from "./AppChip";
export type { AppChipProps } from "./AppChip";

export { AppSection } from "./AppSection";
export type { AppSectionProps } from "./AppSection";

export { AppToolbar, ToolbarGroup } from "./AppToolbar";
export type { AppToolbarProps, ToolbarGroupProps } from "./AppToolbar";

export { AppBottomBar } from "./AppBottomBar";
export type { AppBottomBarProps } from "./AppBottomBar";

export { Badge, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";

export { StatCard, StatCardSkeleton, AnimatedValue } from "./stat-card";
export type { StatCardProps } from "./stat-card";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";

export { ErrorState } from "./error-state";
export type { ErrorStateProps } from "./error-state";

export { LoadingState } from "./LoadingState";
export type { LoadingStateProps } from "./LoadingState";

export { PageShell } from "./page-shell";
export type { PageShellProps } from "./page-shell";

export { ResponsiveGrid } from "./responsive-grid";
export type { ResponsiveGridProps } from "./responsive-grid";

export { SmartActionCard } from "./SmartActionCard";
export type { SmartActionCardProps } from "./SmartActionCard";

export { SectionHeader } from "./section-header";
export type { SectionHeaderProps } from "./section-header";

export { Skeleton, SkeletonText, SkeletonCard, SkeletonList, SkeletonAvatar } from "./skeleton";

export { StatusChip } from "./system/StatusChip";

export { ListRow } from "./system/ListRow";

export { SectionBlock } from "./system/SectionBlock";

export { QuickActionGrid } from "./system/QuickActionGrid";
