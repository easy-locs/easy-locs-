import * as React from "react";
import { cn } from "@/lib/utils";

interface AppToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  sticky?: boolean;
  transparent?: boolean;
}

const AppToolbar = React.forwardRef<HTMLDivElement, AppToolbarProps>(
  ({ sticky = false, transparent = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-2 px-4 min-h-[52px]",
        sticky && "sticky top-0 z-[var(--z-sticky)]",
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-xl border-b border-border/10",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
AppToolbar.displayName = "AppToolbar";

interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

const ToolbarGroup = React.forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({ align = "start", className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 min-w-0",
        align === "end" && "ml-auto shrink-0",
        align === "center" && "flex-1 justify-center",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
ToolbarGroup.displayName = "ToolbarGroup";

export { AppToolbar, ToolbarGroup };
export type { AppToolbarProps, ToolbarGroupProps };
