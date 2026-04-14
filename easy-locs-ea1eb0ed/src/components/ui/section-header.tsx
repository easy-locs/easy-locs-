import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  seeAllPath?: string;
  seeAllLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const SectionHeader = ({
  title,
  description,
  actions,
  seeAllPath,
  seeAllLabel,
  icon,
  className,
  compact = false,
}: SectionHeaderProps) => (
  <div className={cn(
    "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5",
    compact ? "mb-3" : "mb-6",
    className,
  )}>
    <div className="min-w-0 flex items-center gap-2.5">
      {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
      <div className="min-w-0">
        <h2 className={cn(
          "font-bold text-foreground leading-tight tracking-tight",
          compact ? "text-sm" : "text-base sm:text-lg",
        )}>{title}</h2>
        {description && (
          <p className={cn(
            "text-muted-foreground/60 mt-0.5 line-clamp-2",
            compact ? "text-[10px]" : "text-xs",
          )}>{description}</p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {actions}
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
);

export { SectionHeader };
export type { SectionHeaderProps };
