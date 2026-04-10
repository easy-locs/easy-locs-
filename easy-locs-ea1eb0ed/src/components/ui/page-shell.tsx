import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "default";
}

/**
 * PageShell — Consistent page wrapper with title, description, and optional actions.
 * Replaces repetitive page header patterns across the app.
 */
const PageShell = ({
  title,
  description,
  actions,
  children,
  className,
  maxWidth = "default",
}: PageShellProps) => {
  const widthClass = {
    sm: "max-w-2xl",
    md: "max-w-3xl",
    lg: "max-w-5xl",
    xl: "max-w-7xl",
    default: "page-content",
  }[maxWidth];

  return (
    <div className={cn(widthClass, "mx-auto", className)}>
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1>{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export { PageShell };
export type { PageShellProps };
