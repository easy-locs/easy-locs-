import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ListRowProps {
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ListRow({
  icon,
  avatar,
  title,
  subtitle,
  trailing,
  chevron = false,
  onClick,
  destructive,
  disabled,
  className,
}: ListRowProps) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 w-full text-left min-h-[var(--touch-min)]",
        "px-4 py-3 transition-colors duration-100",
        onClick && "active:bg-muted/60 hover:bg-muted/40 cursor-pointer",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {/* Leading */}
      {avatar && <div className="shrink-0">{avatar}</div>}
      {icon && !avatar && (
        <div className={cn(
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
          destructive ? "bg-destructive/10" : "bg-muted",
        )}>
          <span className={cn("[&_svg]:w-4 [&_svg]:h-4", destructive ? "text-destructive" : "text-muted-foreground")}>{icon}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium break-words line-clamp-2 leading-snug",
          destructive ? "text-destructive" : "text-foreground",
        )}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground break-words line-clamp-2 leading-snug mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Trailing */}
      {trailing && <div className="shrink-0 text-sm text-muted-foreground">{trailing}</div>}
      {chevron && <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/50" />}
    </Comp>
  );
}
