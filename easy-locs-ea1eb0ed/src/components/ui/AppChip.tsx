import * as React from "react";
import { cn } from "@/lib/utils";

type ChipVariant = "default" | "primary" | "success" | "warning" | "error" | "info" | "outline";

interface AppChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  selected?: boolean;
}

const VARIANT_MAP: Record<ChipVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/12 text-primary shadow-[0_0_4px_hsl(var(--primary)/0.06)]",
  success: "bg-success/12 text-success shadow-[0_0_4px_hsl(var(--success)/0.06)]",
  warning: "bg-warning/12 text-warning-foreground shadow-[0_0_4px_hsl(var(--warning)/0.06)]",
  error: "bg-destructive/12 text-destructive shadow-[0_0_4px_hsl(var(--destructive)/0.06)]",
  info: "bg-info/12 text-info shadow-[0_0_4px_hsl(var(--info)/0.06)]",
  outline: "border border-border/60 text-foreground bg-transparent",
};

const AppChip = React.forwardRef<HTMLSpanElement, AppChipProps>(
  ({ variant = "default", size = "sm", icon, removable, onRemove, selected, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap max-w-full transition-all duration-200",
        size === "sm" ? "px-2 py-0.5 text-[10px] h-5" : "px-2.5 py-1 text-xs h-6",
        VARIANT_MAP[variant],
        selected && "ring-1 ring-primary/30",
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0 [&_svg]:w-3 [&_svg]:h-3">{icon}</span>}
      <span className="min-w-0 overflow-hidden text-ellipsis">{children}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="shrink-0 ml-0.5 hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}
    </span>
  ),
);
AppChip.displayName = "AppChip";

export { AppChip };
export type { AppChipProps };
