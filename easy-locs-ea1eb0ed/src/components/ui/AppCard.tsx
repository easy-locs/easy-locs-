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
  base: "rounded-2xl border border-border/8 bg-card shadow-[var(--shadow-premium-sm)] transition-all duration-300 ease-[var(--ease-silk)]",
  interactive: "rounded-2xl border border-border/8 bg-card shadow-[var(--shadow-premium-sm)] active:scale-[0.98] transition-all duration-200 ease-[var(--ease-silk)] cursor-pointer hover:shadow-[var(--shadow-premium)] hover:-translate-y-0.5",
  settings: "rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-[var(--glass-blur)] transition-all duration-300",
  elevated: "rounded-2xl border border-border/8 bg-card shadow-[var(--shadow-premium)] transition-all duration-300 ease-[var(--ease-silk)] hover:shadow-[var(--shadow-premium-lg)] hover:-translate-y-0.5",
  kpi: "rounded-2xl border border-border/8 bg-card shadow-[var(--shadow-premium)] overflow-hidden transition-all duration-300 ease-[var(--ease-silk)]",
};

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const STATUS_RING: Record<CardStatus, string> = {
  active: "ring-1 ring-primary/20 shadow-[0_0_8px_hsl(var(--primary)/0.08)]",
  warning: "ring-1 ring-amber-500/20 shadow-[0_0_8px_hsl(38_92%_50%/0.08)]",
  error: "ring-1 ring-destructive/20 shadow-[0_0_8px_hsl(var(--destructive)/0.08)]",
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
        glow && "ring-1 ring-primary/8",
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
