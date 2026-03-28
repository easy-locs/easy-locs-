import * as React from "react";
import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral" | "premium";

interface StatusChipProps {
  label: string;
  variant?: StatusVariant;
  size?: "sm" | "md";
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning-foreground border-warning/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-border/40",
  premium: "bg-accent/10 text-accent-foreground border-accent/20",
};

const dotStyles: Record<StatusVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/40",
  premium: "bg-accent",
};

export function StatusChip({ label, variant = "neutral", size = "sm", dot = true, icon, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 border font-medium rounded-full whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        variantStyles[variant],
        className,
      )}
    >
      {dot && !icon && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles[variant])} />}
      {icon && <span className="shrink-0 [&_svg]:w-3 [&_svg]:h-3">{icon}</span>}
      <span className="min-w-0 overflow-hidden text-ellipsis">{label}</span>
    </span>
  );
}
