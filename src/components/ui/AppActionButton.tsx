/**
 * AppActionButton — Unified action button across all flows.
 * iPhone-fast press feedback with active:scale.
 */
import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface AppActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  full?: boolean;
  loading?: boolean;
}

const VARIANTS = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-card text-foreground border border-border/30",
  danger: "bg-destructive text-destructive-foreground",
} as const;

const AppActionButton = forwardRef<HTMLButtonElement, AppActionButtonProps>(
  ({ variant = "primary", full, loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "rounded-2xl px-5 py-3 text-sm font-bold transition-transform duration-75 active:scale-[0.96] disabled:opacity-50 will-change-transform",
        VARIANTS[variant],
        full && "w-full",
        "flex items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
AppActionButton.displayName = "AppActionButton";

export { AppActionButton };
