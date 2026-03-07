import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  iconClassName?: string;
  label: string;
  value: string;
  sub?: string;
  path?: string;
  valueClassName?: string;
  className?: string;
}

/**
 * Uniform stat/KPI card used across dashboard, finances, fiscal, tenant pages.
 * Structure: Icon → Label → Value → Sub-text, all vertically stacked with equal height.
 */
const StatCard = ({
  icon: Icon,
  iconClassName = "text-muted-foreground",
  label,
  value,
  sub,
  path,
  valueClassName,
  className,
}: StatCardProps) => {
  const content = (
    <div
      className={cn(
        "flex flex-col h-full bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border/50 transition-all",
        path && "hover:shadow-card-hover group cursor-pointer",
        className,
      )}
    >
      {/* Row 1: Icon + optional arrow */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
          <Icon className={cn("h-4 w-4", iconClassName)} />
        </div>
        {path && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
        )}
      </div>
      {/* Row 2: Label — single line */}
      <span className="text-xs sm:text-sm text-muted-foreground truncate mb-1">{label}</span>
      {/* Row 3: Value — prominent, pushed to bottom, never wrap currency */}
      <div className={cn("text-xl sm:text-2xl font-bold text-foreground mt-auto whitespace-nowrap", valueClassName)}>
        {value}
      </div>
      {/* Row 4: Secondary info */}
      {sub && (
        <div className="text-[11px] sm:text-xs text-muted-foreground truncate mt-1">{sub}</div>
      )}
    </div>
  );

  if (path) {
    return <Link to={path} className="h-full">{content}</Link>;
  }
  return content;
};

export { StatCard };
export type { StatCardProps };
