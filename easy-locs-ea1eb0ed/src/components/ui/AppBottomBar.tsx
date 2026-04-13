import * as React from "react";
import { cn } from "@/lib/utils";

interface AppBottomBarProps extends React.HTMLAttributes<HTMLDivElement> {
  transparent?: boolean;
}

const AppBottomBar = React.forwardRef<HTMLDivElement, AppBottomBarProps>(
  ({ transparent = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)]",
        "flex items-center gap-2 px-4 py-3",
        "pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]",
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-md border-t border-border/20",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
AppBottomBar.displayName = "AppBottomBar";

export { AppBottomBar };
export type { AppBottomBarProps };
