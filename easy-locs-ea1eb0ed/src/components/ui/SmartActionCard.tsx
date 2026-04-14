import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SmartActionCardProps {
  icon: React.ElementType;
  label: string;
  path: string;
  count?: number;
  sub?: string;
  loading?: boolean;
  className?: string;
}

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
        "group flex items-center gap-3 bg-card rounded-2xl p-4 border border-border/8",
        "hover:border-accent/15 transition-colors duration-150",
        "min-h-[3.5rem]",
        className,
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-accent/6 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors duration-150">
        <Icon className="h-[18px] w-[18px] text-muted-foreground group-hover:text-accent transition-colors duration-150" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground leading-tight block">
          {label}
        </span>
        {sub && (
          <span className="text-[11px] text-muted-foreground/70 block mt-0.5 break-words leading-snug">
            {sub}
          </span>
        )}
      </div>

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
