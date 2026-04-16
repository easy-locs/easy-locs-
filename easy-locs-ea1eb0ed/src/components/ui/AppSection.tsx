import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface AppSectionProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  seeAllPath?: string;
  seeAllLabel?: string;
  children: React.ReactNode;
  compact?: boolean;
  padded?: boolean;
  className?: string;
}

const AppSection = ({
  title,
  description,
  icon,
  action,
  seeAllPath,
  seeAllLabel,
  children,
  compact = false,
  padded = false,
  className,
}: AppSectionProps) => {
  const hasHeader = title || action || seeAllPath;

  return (
    <section className={cn(compact ? "mb-5" : "mb-8", className)}>
      {hasHeader && (
        <div className={cn(
          "flex items-center justify-between gap-2",
          compact ? "mb-2.5" : "mb-4",
          padded && "px-4",
        )}>
          <div className="min-w-0 flex items-center gap-2.5">
            {icon && <span className="shrink-0 [&_svg]:w-4 [&_svg]:h-4 text-muted-foreground">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h3 className={cn(
                  "font-bold text-foreground leading-tight break-words tracking-tight",
                  compact ? "text-xs uppercase tracking-wider text-muted-foreground" : "text-sm",
                )}>
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-[0.625rem] text-muted-foreground/60 mt-0.5 line-clamp-1">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {action}
            {seeAllPath && (
              <Link
                to={seeAllPath}
                className="text-xs font-medium text-primary flex items-center gap-0.5 hover:underline"
              >
                {seeAllLabel || "See all"} <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}
      <div className={cn(padded && "px-4")}>{children}</div>
    </section>
  );
};

export { AppSection };
export type { AppSectionProps };
