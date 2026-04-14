import * as React from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "w-full min-w-0 overflow-hidden border border-border/40 bg-card text-card-foreground rounded-[var(--card-radius)] shadow-[var(--shadow-premium-sm)] transition-all duration-300 ease-[var(--ease-silk)] hover:shadow-[var(--shadow-premium)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-5 pb-0 min-w-0", className)}
      style={style}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-base font-semibold leading-snug tracking-tight line-clamp-2 break-words", className)}
      {...props}
    >
      {children ?? null}
    </h3>
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground line-clamp-3 break-words", className)} {...props}>
      {children ?? null}
    </p>
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-5 pt-0 min-w-0", className)}
      style={style}
      {...props}
    />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-wrap items-center gap-2 p-5 pt-0 min-w-0", className)}
      style={style}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

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

const AppCard = React.memo(React.forwardRef<HTMLDivElement, AppCardProps>(
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

interface CardShellProps {
  to: string;
  className?: string;
  index?: number;
  layout?: "horizontal" | "vertical";
  children: React.ReactNode;
}

function CardShell({ to, className, index = 0, layout = "horizontal", children }: CardShellProps) {
  if (!children) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: layout === "vertical" ? 10 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="min-w-0"
    >
      <Link
        to={to}
        data-card="shell"
        className={cn(
          "min-w-0",
          layout === "vertical"
            ? "block rounded-2xl border border-border/15 bg-card active:scale-[0.97] transition-transform shadow-sm [&>img]:overflow-hidden"
            : "flex gap-3 p-3 rounded-2xl border border-border/15 bg-card active:scale-[0.97] transition-transform shadow-sm min-w-0 [&>img]:overflow-hidden",
          className,
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, AppCard, CardShell };
export type { AppCardProps, CardShellProps };
