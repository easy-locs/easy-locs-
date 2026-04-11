/**
 * AppCard — Unified card component used across the entire app.
 * Supports base layout, interactive, settings, elevated, and KPI variants.
 * Replaces AppCard, FuturisticCard, and ad-hoc card styles.
 */
import { cn } from "@/lib/utils";
import { forwardRef, memo } from "react";

type CardVariant = "base" | "interactive" | "settings" | "elevated" | "kpi";
type CardPadding = "none" | "sm" | "md" | "lg";
type CardStatus = "active" | "warning" | "error" | "idle";

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  status?: CardStatus;
  glow?: boolean;
  loading?: boolean;
}

const VARIANTS: Record<CardVariant, string> = {
  base: "rounded-2xl border border-border/20 bg-card",
  interactive: "rounded-2xl border border-border/20 bg-card active:scale-[0.98] transition-transform duration-100 cursor-pointer",
  settings: "rounded-2xl border border-border/15 bg-card/95 backdrop-blur-sm",
  elevated: "rounded-2xl border border-border/10 bg-card shadow-[0_4px_16px_hsl(var(--foreground)/0.06)]",
  kpi: "rounded-2xl border border-border/15 bg-card shadow-[0_4px_16px_hsl(var(--foreground)/0.06)] overflow-hidden",
};

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const STATUS_RING: Record<CardStatus, string> = {
  active: "ring-1 ring-primary/20",
  warning: "ring-1 ring-amber-500/20",
  error: "ring-1 ring-destructive/20",
  idle: "",
};

const AppCard = memo(forwardRef<HTMLDivElement, AppCardProps>(
  ({ variant = "base", padding = "md", status, glow, loading, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        VARIANTS[variant],
        PADDING[padding],
        status && STATUS_RING[status],
        glow && "ring-1 ring-primary/10",
        loading && "animate-pulse",
        className,
      )}
      data-card={variant}
      {...props}
    >
      {children}
    </div>
  )
));
AppCard.displayName = "AppCard";

export { AppCard };
export type { AppCardProps };
