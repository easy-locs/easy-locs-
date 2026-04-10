import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SmartActionCardProps {
  /** Lucide icon component */
  icon: React.ElementType;
  /** Label text — always visible, never truncated */
  label: string;
  /** Navigation path — card is always clickable */
  path: string;
  /** Optional counter badge (real data) */
  count?: number;
  /** Optional sub-label */
  sub?: string;
  /** Whether the card is in a loading state */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * SmartActionCard — unified navigation card used across all modules.
 *
 * Enforces 3 quality layers:
 * 1. UI: Uniform height, padding, radius, icon + text alignment
 * 2. Functional: Always a real <Link>, always clickable, correct path
 * 3. Sync: Counter badge shows real data, updates reactively
 */
const SmartActionCard = ({
  icon: Icon,
  label,
  path,
  count,
  sub,
  loading = false,
  className,
}: SmartActionCardProps) => {
  return (
    <Link
      to={path}
      className={cn(
        "group flex items-center gap-3 bg-card rounded-[var(--card-radius)] p-4 border border-border/40",
        "shadow-card hover:shadow-card-hover hover:-translate-y-0.5 hover:border-accent/30 transition-all duration-200",
        "min-h-[3.5rem]",
        className,
      )}
    >
      {/* Icon box — fixed size */}
      <div className="icon-box group-hover:bg-accent/12 transition-colors duration-200">
        <Icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-accent transition-colors duration-200" />
      </div>

      {/* Label — never truncated on mobile */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground leading-tight block">
          {label}
        </span>
        {sub && (
          <span className="text-[11px] text-muted-foreground block mt-0.5 break-words leading-snug">
            {sub}
          </span>
        )}
      </div>

      {/* Counter badge — synced with real data */}
      {count !== undefined && (
        <span
          className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums",
            loading
              ? "bg-muted text-muted-foreground animate-pulse"
              : count > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          {loading ? "…" : count}
        </span>
      )}
    </Link>
  );
};

export { SmartActionCard };
export type { SmartActionCardProps };
