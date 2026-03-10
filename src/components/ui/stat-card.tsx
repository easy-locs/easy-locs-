import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
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
        "flex flex-col h-full bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border/50 transition-all duration-300 relative overflow-hidden",
        path && "hover:shadow-card-hover hover:border-accent/30 group cursor-pointer",
        className,
      )}
    >
      {/* Hover accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Row 1: Icon + optional arrow */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors duration-300">
          <Icon className={cn("h-4.5 w-4.5", iconClassName)} />
        </div>
        {path && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
        )}
      </div>
      {/* Row 2: Label — single line */}
      <span className="text-xs sm:text-sm text-muted-foreground truncate mb-1">{label}</span>
      {/* Row 3: Value — prominent, pushed to bottom */}
      <div className={cn(
        "font-bold text-foreground mt-auto truncate",
        /^[\d\s.,€$£¥₹%—–-]+$/.test(value)
          ? "text-xl sm:text-2xl whitespace-nowrap tabular-nums"
          : "text-sm sm:text-base",
        valueClassName,
      )}>
        {value}
      </div>
      {/* Row 4: Secondary info */}
      {sub && (
        <div className="text-[11px] sm:text-xs text-muted-foreground truncate mt-1">{sub}</div>
      )}
    </div>
  );

  if (path) {
    return <Link to={path} className="h-full block">{content}</Link>;
  }
  return content;
};

export { StatCard };
export type { StatCardProps };
