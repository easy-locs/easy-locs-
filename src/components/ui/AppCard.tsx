/**
 * AppCard — Unified card component used across the entire app.
 * Replaces ad-hoc card styles for business, order, wallet, settings cards.
 */
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "base" | "interactive" | "settings" | "elevated";
  padding?: "sm" | "md" | "lg";
}

const VARIANTS = {
  base: "rounded-2xl border border-border/20 bg-card",
  interactive: "rounded-2xl border border-border/20 bg-card active:scale-[0.98] transition-transform duration-100 cursor-pointer",
  settings: "rounded-2xl border border-border/15 bg-card/95 backdrop-blur-sm",
  elevated: "rounded-2xl border border-border/10 bg-card shadow-[0_4px_16px_hsl(var(--foreground)/0.06)]",
} as const;

const PADDING = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

const AppCard = forwardRef<HTMLDivElement, AppCardProps>(
  ({ variant = "base", padding = "md", className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(VARIANTS[variant], PADDING[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
);
AppCard.displayName = "AppCard";

export { AppCard };
export type { AppCardProps };
