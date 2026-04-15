/**
 * @deprecated Import directly from "@/lib/design-tokens" instead.
 * This file re-exports all tokens from the canonical DESIGN_TOKENS source.
 * Kept for backward compatibility — all values derive from DESIGN_TOKENS.
 */
import { DESIGN_TOKENS } from "@/lib/design-tokens";

export {
  DESIGN_TOKENS,
  DESIGN_SYSTEM_VERSION,
  generateCSSCustomProperties as generateCSSVariables,
  getSpacing,
  getRadius,
  getElevation,
  getColor,
  getTypography,
} from "@/lib/design-tokens";

export const SPACING = DESIGN_TOKENS.spacing;

export const SPACING_PX = Object.fromEntries(
  Object.entries(DESIGN_TOKENS.spacing).filter(([k]) => ["1", "2", "3", "4", "6", "8", "12", "16"].includes(k)),
) as Record<string, string>;

export const RADIUS = DESIGN_TOKENS.radius;

export const SHADOW = DESIGN_TOKENS.elevation;

export const COLOR = DESIGN_TOKENS.colors;

export const GRADIENT = DESIGN_TOKENS.gradient;

export const SURFACE = {
  card: {
    background: DESIGN_TOKENS.gradient.card,
    border: `1px solid ${DESIGN_TOKENS.colors.borderSubtle}`,
    boxShadow: DESIGN_TOKENS.elevation.card,
    borderRadius: DESIGN_TOKENS.radius["2xl"],
  },
  elevated: {
    background: DESIGN_TOKENS.colors.surfaceElevated,
    border: `1px solid ${DESIGN_TOKENS.colors.borderSubtle}`,
    boxShadow: DESIGN_TOKENS.elevation.elevated,
    borderRadius: DESIGN_TOKENS.radius.xl,
  },
  glass: {
    background: "hsl(226 24% 10% / 0.7)",
    backdropFilter: "blur(20px) saturate(1.3)",
    WebkitBackdropFilter: "blur(20px) saturate(1.3)",
    border: `1px solid ${DESIGN_TOKENS.colors.borderSubtle}`,
    boxShadow: DESIGN_TOKENS.elevation.card,
    borderRadius: DESIGN_TOKENS.radius["2xl"],
  },
} as const;

export const TYPOGRAPHY = DESIGN_TOKENS.typography;

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
