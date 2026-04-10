/**
 * FuturisticCard — Premium animated card with glow, shimmer, and smart interactions.
 * Unified across all dashboards: KPI, engine, merchant, analytics cards.
 */
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type CardVariant = "default" | "kpi" | "engine" | "financial" | "status" | "interactive";

interface FuturisticCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  variant?: CardVariant;
  glow?: boolean;
  status?: "active" | "warning" | "error" | "idle";
}

const BASE = "rounded-2xl border bg-card overflow-hidden transition-all duration-200";

const VARIANT_STYLES: Record<CardVariant, string> = {
  default: "border-border/20 shadow-[0_2px_8px_hsl(var(--foreground)/0.04)]",
  kpi: "border-border/15 shadow-[0_4px_16px_hsl(var(--foreground)/0.06)]",
  engine: "border-border/20 shadow-[0_2px_12px_hsl(var(--foreground)/0.05)]",
  financial: "border-border/15 shadow-[0_4px_20px_hsl(var(--foreground)/0.06)]",
  status: "border-border/20",
  interactive: "border-border/20 cursor-pointer hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.08)] active:scale-[0.98]",
};

const STATUS_GLOW: Record<string, string> = {
  active: "shadow-[0_0_12px_hsl(var(--primary)/0.15)]",
  warning: "shadow-[0_0_12px_hsl(40_95%_50%/0.15)]",
  error: "shadow-[0_0_12px_hsl(0_85%_60%/0.15)]",
  idle: "",
};

const FuturisticCard = forwardRef<HTMLDivElement, FuturisticCardProps>(
  ({ variant = "default", glow = false, status, className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={variant === "interactive" ? { y: -2, scale: 1.01 } : undefined}
      className={cn(
        BASE,
        VARIANT_STYLES[variant],
        status && STATUS_GLOW[status],
        glow && "ring-1 ring-primary/10",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FuturisticCard.displayName = "FuturisticCard";

export { FuturisticCard };
export type { FuturisticCardProps };
