import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionBlockProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  className?: string;
}

/**
 * SectionBlock — groups content with optional title and trailing action.
 * Used across Home, Profile, Wallet, Explore.
 */
export function SectionBlock({ title, action, children, padded = true, className }: SectionBlockProps) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || action) && (
        <div className={cn("flex items-center justify-between mb-3", padded && "px-4")}>
          {title && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(padded && "px-4")}>{children}</div>
    </section>
  );
}
